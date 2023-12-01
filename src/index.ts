import core from "@actions/core";

import { attemptInstall } from "./installation/installation";


async function main()
{
    try
    {
        const info = await attemptInstall();
        core.setOutput('directory', info.directory);
        core.setOutput('executable', info.executable);
        core.addPath(info.binDirectory);
    }
    catch (error)
    {
        core.setFailed(error);
    }
}

void main();
