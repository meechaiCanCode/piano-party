import { execSync } from "child_process";

export default function globalSetup() {
    execSync("npm run --silent db:reset", { stdio: "inherit" });
}
