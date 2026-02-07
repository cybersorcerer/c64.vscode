#!/bin/bash
# Build script for bundling kickass_ls and c64u binaries into the VSCode extension
# Automatically pulls latest changes and only rebuilds when source has changed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BINARIES_DIR="$PROJECT_ROOT/binaries"
STATE_FILE="$BINARIES_DIR/.build-state"

# Source paths (relative to user's source directory)
KICKASS_LS_DIR="${KICKASS_LS_DIR:-$HOME/My_Documents/source/gitlab/kickass_ls}"
C64U_DIR="${C64U_DIR:-$HOME/My_Documents/source/gitlab/c64u/tools/c64u}"
# Git root for c64u (c64u is a subdirectory)
C64U_GIT_ROOT="${C64U_DIR%/tools/c64u}"

# Supported platforms
PLATFORMS=(
    "darwin-amd64"
    "darwin-arm64"
    "linux-amd64"
    "linux-arm64"
    "windows-amd64"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_go() {
    if ! command -v go &> /dev/null; then
        log_error "Go is not installed. Please install Go first."
        exit 1
    fi
    log_info "Go version: $(go version)"
}

# Get the current HEAD commit hash for a git repo
get_git_hash() {
    local dir=$1
    if [ -d "$dir/.git" ] || git -C "$dir" rev-parse --git-dir > /dev/null 2>&1; then
        git -C "$dir" rev-parse HEAD 2>/dev/null
    else
        echo "unknown"
    fi
}

# Get the last built commit hash from state file
get_last_built_hash() {
    local key=$1
    if [ -f "$STATE_FILE" ]; then
        grep "^${key}=" "$STATE_FILE" 2>/dev/null | cut -d'=' -f2
    fi
}

# Save the current commit hash to state file
save_built_hash() {
    local key=$1
    local hash=$2
    mkdir -p "$(dirname "$STATE_FILE")"
    # Remove old entry and append new one
    if [ -f "$STATE_FILE" ]; then
        grep -v "^${key}=" "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null || true
        mv "${STATE_FILE}.tmp" "$STATE_FILE"
    fi
    echo "${key}=${hash}" >> "$STATE_FILE"
}

# Pull latest changes from a git repo
pull_latest() {
    local dir=$1
    local name=$2

    if [ ! -d "$dir" ]; then
        log_error "$name source not found at: $dir"
        return 1
    fi

    log_info "Pulling latest $name..."
    (
        cd "$dir"
        # Stash any local changes
        local stash_output
        stash_output=$(git stash 2>&1) || true

        # Pull latest
        if git pull --ff-only 2>&1; then
            log_success "$name updated"
        else
            log_warning "$name pull failed (maybe on detached HEAD or diverged), using current state"
        fi

        # Restore stashed changes
        if [[ "$stash_output" != *"No local changes"* ]]; then
            git stash pop 2>/dev/null || true
        fi
    )
}

# Check if a rebuild is needed
needs_rebuild() {
    local key=$1
    local dir=$2

    local current_hash
    current_hash=$(get_git_hash "$dir")
    local last_hash
    last_hash=$(get_last_built_hash "$key")

    if [ "$current_hash" = "$last_hash" ]; then
        return 1 # No rebuild needed
    fi
    return 0 # Rebuild needed
}

clean_binaries() {
    log_info "Cleaning old binaries..."
    rm -rf "$BINARIES_DIR"
    mkdir -p "$BINARIES_DIR"
}

build_kickass_ls() {
    local platform=$1
    local os=$(echo $platform | cut -d'-' -f1)
    local arch=$(echo $platform | cut -d'-' -f2)
    local ext=""

    if [ "$os" = "windows" ]; then
        ext=".exe"
    fi

    local output_dir="$BINARIES_DIR/$platform"
    mkdir -p "$output_dir"

    log_info "Building kickass_ls for $platform..."

    if [ ! -d "$KICKASS_LS_DIR" ]; then
        log_error "kickass_ls source not found at: $KICKASS_LS_DIR"
        log_error "Set KICKASS_LS_DIR environment variable to the correct path"
        return 1
    fi

    local version
    version=$(cd "$KICKASS_LS_DIR" && git describe --tags --always --dirty 2>/dev/null || echo "dev")

    (
        cd "$KICKASS_LS_DIR"
        GOOS=$os GOARCH=$arch go build -trimpath \
            -ldflags "-s -w -X main.Version=$version" \
            -o "$output_dir/kickass_ls$ext" .
    )

    # Copy config files
    cp "$KICKASS_LS_DIR/kickass.json" "$output_dir/" 2>/dev/null || true
    cp "$KICKASS_LS_DIR/mnemonic.json" "$output_dir/" 2>/dev/null || true
    cp "$KICKASS_LS_DIR/c64memory.json" "$output_dir/" 2>/dev/null || true

    log_success "kickass_ls $version for $platform"
}

build_c64u() {
    local platform=$1
    local os=$(echo $platform | cut -d'-' -f1)
    local arch=$(echo $platform | cut -d'-' -f2)
    local ext=""

    if [ "$os" = "windows" ]; then
        ext=".exe"
    fi

    local output_dir="$BINARIES_DIR/$platform"
    mkdir -p "$output_dir"

    log_info "Building c64u for $platform..."

    if [ ! -d "$C64U_DIR" ]; then
        log_error "c64u source not found at: $C64U_DIR"
        log_error "Set C64U_DIR environment variable to the correct path"
        return 1
    fi

    local version
    version=$(cd "$C64U_GIT_ROOT" && git describe --tags --always --dirty 2>/dev/null || echo "dev")

    (
        cd "$C64U_DIR"
        GOOS=$os GOARCH=$arch go build -trimpath \
            -ldflags "-s -w -X main.version=$version" \
            -o "$output_dir/c64u$ext" ./cmd/c64u
    )

    log_success "c64u $version for $platform"
}

build_for_platforms() {
    local platforms=("$@")
    for platform in "${platforms[@]}"; do
        build_kickass_ls "$platform" || log_warning "Failed to build kickass_ls for $platform"
        build_c64u "$platform" || log_warning "Failed to build c64u for $platform"
    done
}

build_current_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    case $arch in
        x86_64) arch="amd64" ;;
        aarch64|arm64) arch="arm64" ;;
    esac

    build_for_platforms "$os-$arch"
}

show_status() {
    echo ""
    log_info "=== Binary Status ==="

    # Show kickass_ls info
    if [ -d "$KICKASS_LS_DIR" ]; then
        local ks_hash ks_last ks_version
        ks_hash=$(get_git_hash "$KICKASS_LS_DIR")
        ks_last=$(get_last_built_hash "kickass_ls")
        ks_version=$(cd "$KICKASS_LS_DIR" && git describe --tags --always --dirty 2>/dev/null || echo "dev")
        echo -e "  kickass_ls: version=${CYAN}$ks_version${NC} commit=${ks_hash:0:8}"
        if [ "$ks_hash" = "$ks_last" ]; then
            echo -e "             ${GREEN}up to date${NC}"
        else
            echo -e "             ${YELLOW}rebuild needed${NC} (built: ${ks_last:0:8:-"never"})"
        fi
    else
        echo -e "  kickass_ls: ${RED}source not found${NC}"
    fi

    # Show c64u info
    if [ -d "$C64U_GIT_ROOT" ]; then
        local c64u_hash c64u_last c64u_version
        c64u_hash=$(get_git_hash "$C64U_GIT_ROOT")
        c64u_last=$(get_last_built_hash "c64u")
        c64u_version=$(cd "$C64U_GIT_ROOT" && git describe --tags --always --dirty 2>/dev/null || echo "dev")
        echo -e "  c64u:      version=${CYAN}$c64u_version${NC} commit=${c64u_hash:0:8}"
        if [ "$c64u_hash" = "$c64u_last" ]; then
            echo -e "             ${GREEN}up to date${NC}"
        else
            echo -e "             ${YELLOW}rebuild needed${NC} (built: ${c64u_last:0:8:-"never"})"
        fi
    else
        echo -e "  c64u:      ${RED}source not found${NC}"
    fi
    echo ""
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Build kickass_ls and c64u binaries for the VSCode extension."
    echo "Automatically pulls latest changes and skips builds if up to date."
    echo ""
    echo "Options:"
    echo "  --all         Build for all supported platforms"
    echo "  --current     Build only for the current platform (default)"
    echo "  --clean       Clean binaries directory before building"
    echo "  --force       Force rebuild even if binaries are up to date"
    echo "  --no-pull     Skip git pull (use current local state)"
    echo "  --status      Show current binary versions and build state"
    echo "  --help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  KICKASS_LS_DIR  Path to kickass_ls source (default: ~/My_Documents/source/gitlab/kickass_ls)"
    echo "  C64U_DIR        Path to c64u source (default: ~/My_Documents/source/gitlab/c64u/tools/c64u)"
    echo ""
    echo "Supported platforms:"
    for platform in "${PLATFORMS[@]}"; do
        echo "  - $platform"
    done
}

# Main
main() {
    local build_all=false
    local clean=false
    local force=false
    local no_pull=false
    local status_only=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                build_all=true
                shift
                ;;
            --current)
                build_all=false
                shift
                ;;
            --clean)
                clean=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            --no-pull)
                no_pull=true
                shift
                ;;
            --status)
                status_only=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Status only mode
    if [ "$status_only" = true ]; then
        show_status
        exit 0
    fi

    check_go

    # Pull latest changes unless --no-pull
    if [ "$no_pull" = false ]; then
        pull_latest "$KICKASS_LS_DIR" "kickass_ls" || true
        pull_latest "$C64U_GIT_ROOT" "c64u" || true
    fi

    # Check if rebuild is needed
    local kickass_needs_build=false
    local c64u_needs_build=false

    if [ "$force" = true ] || [ "$clean" = true ]; then
        kickass_needs_build=true
        c64u_needs_build=true
    else
        if needs_rebuild "kickass_ls" "$KICKASS_LS_DIR"; then
            kickass_needs_build=true
            log_info "kickass_ls has new changes - rebuilding"
        else
            log_success "kickass_ls binaries are up to date"
        fi

        if needs_rebuild "c64u" "$C64U_GIT_ROOT"; then
            c64u_needs_build=true
            log_info "c64u has new changes - rebuilding"
        else
            log_success "c64u binaries are up to date"
        fi
    fi

    # Nothing to do
    if [ "$kickass_needs_build" = false ] && [ "$c64u_needs_build" = false ]; then
        log_success "All binaries are up to date. Use --force to rebuild anyway."
        exit 0
    fi

    if [ "$clean" = true ]; then
        clean_binaries
    fi

    mkdir -p "$BINARIES_DIR"

    # Determine platforms to build
    if [ "$build_all" = true ]; then
        local build_platforms=("${PLATFORMS[@]}")
    else
        local os=$(uname -s | tr '[:upper:]' '[:lower:]')
        local arch=$(uname -m)
        case $arch in
            x86_64) arch="amd64" ;;
            aarch64|arm64) arch="arm64" ;;
        esac
        local build_platforms=("$os-$arch")
    fi

    # Build what's needed
    for platform in "${build_platforms[@]}"; do
        if [ "$kickass_needs_build" = true ]; then
            build_kickass_ls "$platform" || log_warning "Failed to build kickass_ls for $platform"
        fi
        if [ "$c64u_needs_build" = true ]; then
            build_c64u "$platform" || log_warning "Failed to build c64u for $platform"
        fi
    done

    # Save build state
    if [ "$kickass_needs_build" = true ]; then
        save_built_hash "kickass_ls" "$(get_git_hash "$KICKASS_LS_DIR")"
    fi
    if [ "$c64u_needs_build" = true ]; then
        save_built_hash "c64u" "$(get_git_hash "$C64U_GIT_ROOT")"
    fi

    log_success "Build complete!"
    show_status
}

main "$@"
