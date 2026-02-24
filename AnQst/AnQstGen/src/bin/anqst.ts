#!/usr/bin/env node
import { runCommand } from "../app";

const [, , command, specArg] = process.argv;
const code = runCommand(command, specArg);
process.exitCode = code;
