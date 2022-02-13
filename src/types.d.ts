import { BaseFileRemote } from "@remotefull/file";
import { BaseCmdRemote } from "@remotefull/commander/dist/remote/BaseCmdRemote";

export interface DeployOptions {
  rootDir?: string;
  onlyUpdateEnv?: boolean;
  skipPostCommands?: boolean;
  remoteDir: string;
  clearFolders?: string[];
  ensureFolders?: string[];
  deletePaths?: {
    dirs?: string[];
    files?: string[];
  };
  upload?: string[];
  commands?: string[];
  envFields?: string[];
}

export interface Credentials {
  host: string;
  port: number;
  username: string;
  password?: string;
}

export interface DeployFunctionOptions {
  uploader: BaseFileRemote;
  remote?: BaseCmdRemote;
  deployOptions: DeployOptions;
}
