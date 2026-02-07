import { executeC64UJson } from './cli';

export interface C64UFile {
    name: string;
    is_dir: boolean;
    size: number;
    path: string;
}

interface C64URawFile {
    Name: string;
    Size: number;
    IsDir: boolean;
    Type: string;
}

export class C64UClient {
    constructor() {
        // Host and port are read from workspace config by executeC64UJson
    }

    async listFiles(targetPath: string): Promise<C64UFile[]> {
        const rawFiles = await executeC64UJson<C64URawFile[]>(['fs', 'ls', targetPath]);

        // null means error, empty array means empty directory
        if (rawFiles === null) {
            throw new Error('Failed to list files');
        }

        // Empty directory returns empty array
        if (rawFiles.length === 0) {
            return [];
        }

        // Convert from API format to our format
        return rawFiles.map(file => {
            const fullPath = targetPath === '/'
                ? `/${file.Name}`
                : `${targetPath}/${file.Name}`;

            return {
                name: file.Name,
                is_dir: file.IsDir,
                size: file.Size,
                path: fullPath
            };
        });
    }
}
