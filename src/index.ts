import { BaseFileRemote } from "@remotefull/file";
import { BaseCmdRemote } from "@remotefull/commander/dist/remote/BaseCmdRemote";
import { Channel } from "ssh2";
import inquirer from "inquirer";
import path from "path";
import { cmd, err, info, ok } from "./utils";
import { DeployOptions } from "./types";

export class Deploy {
  /**
   * Local root directory.
   */
  private rootDir: string;

  /**
   * Remote root directory.
   */
  private readonly remoteDir: string;

  /**
   * Clears the specified folders or creates them
   * if they're not on the server.
   */
  private clearFolders: string[];

  /**
   * Folders such as logs or temp that need to exist
   */
  private readonly ensureFolders: string[];

  /**
   * Deletes the specified paths.
   */
  private deletePaths: { dirs: string[]; files: string[] } = {
    dirs: [],
    files: [],
  };

  /**
   * Uploads the specified local paths to the remote.
   */
  private readonly upload: string[];

  /**
   * Commands executed in SSH connections.
   */
  private readonly commands: string[];

  /**
   * Environment variables to write in remote .env file.
   */
  private readonly envFields: string[];

  constructor(
    public file: BaseFileRemote,
    public cmd: BaseCmdRemote | null | undefined,
    private options: DeployOptions
  ) {
    this.rootDir = options.rootDir ?? process.cwd();
    this.remoteDir = options.remoteDir ?? "/var/www/html";
    this.clearFolders = options.clearFolders ?? [];
    this.ensureFolders = options.ensureFolders ?? [];
    options.deletePaths &&
      (this.deletePaths = {
        dirs: options.deletePaths.dirs ?? [],
        files: options.deletePaths.files ?? [],
      });
    this.upload = options.upload ?? [];
    this.commands = options.commands ?? [];
    this.envFields = options.envFields ?? [];

    this.file.setPathPrefix(this.remoteDir);
  }

  public async run(): Promise<Deploy> {
    const startTime = Date.now();

    info("connecting to file remote.");
    await this.file.connect();
    ok("connected.");

    if (!this.options.onlyUpdateEnv) {
      for (let ensureFolder of this.ensureFolders) {
        if (!(await this.file.exists(ensureFolder))) {
          info(`creating folder ${ensureFolder} on the remote.`);

          /**
           * If the folder was just created there is no need to clear it,
           * so remove it from clearFolders.
           */
          this.clearFolders = this.clearFolders.filter(
            folder => folder !== ensureFolder
          );

          await this.file.createDir(ensureFolder);
        }
      }

      for (let folder of this.clearFolders) {
        info(`clearing folder ${folder} on the remote.`);
        await this.file.delete(folder);
        await this.file.createDir(folder);
      }

      for (let deletePath of this.deletePaths.files) {
        info(`deleting file ${deletePath} on the remote.`);

        await this.file.delete(deletePath);
      }

      for (let deletePath of this.deletePaths.dirs) {
        info(`deleting dir ${deletePath} on the remote.`);

        await this.file.deleteDir(deletePath);
      }

      for (let uploadPath of this.upload) {
        info(`uploading ${uploadPath} to the remote.`);

        await this.file.uploadFile(
          path.join(this.rootDir, uploadPath),
          uploadPath
        );
      }
    }

    info("configuring env...");
    const envLines: string[] = [];

    for (const envField of this.envFields) {
      let value =
        process.env[`PROD_${envField}`] ?? process.env[envField] ?? "";

      if (!value) {
        const values = await inquirer.prompt([
          {
            name: envField,
            type: "input",
          },
        ]);

        value = values[envField];
      }

      if (value.trim().length >= 1) {
        envLines.push(`${envField}=${value}`);
      }
    }

    const envFile = envLines.join("\n");
    console.log(envFile);

    await this.file.createFile(".env", envFile);

    await this.file.disconnect();
    ok("disconnected from file remote.");

    if (this.cmd && !this.options.skipPostCommands) {
      info("connecting to cmd remote.");
      await this.cmd.connect();
      ok("connected.");

      for (const command of this.commands) {
        await new Promise(async res => {
          info(`executing command ${command} on remote`);
          const stream: Channel = await this.cmd!.getClient().spawn(command);

          stream.on("data", (data: any) => cmd(data.toString()));
          stream.on("error", err);
          stream.on("close", res);
        });
      }

      await this.cmd.disconnect();
      ok("disconnected from remote.");
    }

    ok(`deploy done in ${Date.now() - startTime}ms`);

    return this;
  }
}
