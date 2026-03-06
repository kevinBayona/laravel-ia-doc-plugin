import { execSync } from "child_process";

export function getGitDiff(): string {

    try {

        const diff = execSync("git diff HEAD").toString();

        return diff;

    } catch (error) {

        return "";

    }

}