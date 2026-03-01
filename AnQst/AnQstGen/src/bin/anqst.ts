#!/usr/bin/env node
import { runCommand } from "../app";

const [, , command, ...args] = process.argv;
const [specArg, ...extraArgs] = args;
const code = runCommand(command, specArg, extraArgs);
process.exitCode = code;
