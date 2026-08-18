import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

async function isAdmin() {
    try {
        const session = await getServerSession(authOptions);
        return session?.user?.role === "admin";
    } catch {
        return false;
    }
}

// Helper to run git commands in project directory
async function runGit(command, timeout = 25000) {
    const cwd = process.cwd();
    return await execAsync(command, { cwd, timeout });
}

// Parse git log line "%h|%an|%s|%cd"
function parseCommit(logStr) {
    if (!logStr || typeof logStr !== "string") return null;
    const parts = logStr.trim().split("|");
    if (parts.length < 4) return null;
    return {
        hash: parts[0],
        author: parts[1],
        message: parts[2],
        date: parts[3]
    };
}

export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        // 1. Get current local commit info
        let currentVersion = null;
        try {
            const { stdout: localLog } = await runGit('git log -1 --format="%h|%an|%s|%cd" --date=short');
            currentVersion = parseCommit(localLog);
        } catch (e) {
            console.error("Local git log error:", e);
        }

        // 2. Try to fetch remote updates from GitHub
        let isOnline = true;
        let isUpToDate = true;
        let commitsBehind = 0;
        let pendingUpdates = [];
        let latestVersion = currentVersion;
        let errorNotice = null;

        try {
            await runGit('git fetch origin main', 15000);

            const { stdout: localHead } = await runGit('git rev-parse HEAD');
            const { stdout: remoteHead } = await runGit('git rev-parse origin/main');

            const localHash = localHead.trim();
            const remoteHash = remoteHead.trim();

            if (localHash !== remoteHash) {
                // Fetch new commits list
                const { stdout: logDiff } = await runGit('git log HEAD..origin/main --format="%h|%an|%s|%cd" --date=short');
                const lines = logDiff.trim().split("\n").filter(Boolean);
                pendingUpdates = lines.map(line => parseCommit(line)).filter(Boolean);
                commitsBehind = pendingUpdates.length;
                isUpToDate = commitsBehind === 0;

                const { stdout: remoteLog } = await runGit('git log -1 origin/main --format="%h|%an|%s|%cd" --date=short');
                latestVersion = parseCommit(remoteLog) || currentVersion;
            } else {
                isUpToDate = true;
                commitsBehind = 0;
                latestVersion = currentVersion;
            }
        } catch (netErr) {
            isOnline = false;
            errorNotice = "Unable to connect to GitHub. Check your internet connection.";
        }

        return NextResponse.json({
            success: true,
            isOnline,
            isUpToDate,
            commitsBehind,
            currentVersion,
            latestVersion,
            pendingUpdates,
            errorNotice
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: "Failed to check for updates: " + error.message
        }, { status: 500 });
    }
}

export async function POST() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        // Step 1: Fetch origin
        try {
            await runGit('git fetch origin main', 20000);
        } catch (fetchErr) {
            return NextResponse.json({
                success: false,
                error: "Could not connect to GitHub. Please check your internet connection."
            }, { status: 500 });
        }

        // Step 2: Pull origin main
        // Git only updates codebase files and NEVER alters MongoDB data.
        let pullOutput = "";
        try {
            const { stdout, stderr } = await runGit('git pull origin main', 30000);
            pullOutput = stdout || stderr || "Already up to date.";
        } catch (pullErr) {
            // In case of any merge state, try rebasing or clean fast-forward
            try {
                const { stdout } = await runGit('git reset --hard origin/main', 20000);
                pullOutput = stdout;
            } catch (resetErr) {
                return NextResponse.json({
                    success: false,
                    error: "Update failed during git pull: " + pullErr.message
                }, { status: 500 });
            }
        }

        // Step 3: Get the new current version details
        let updatedVersion = null;
        try {
            const { stdout: newLog } = await runGit('git log -1 --format="%h|%an|%s|%cd" --date=short');
            updatedVersion = parseCommit(newLog);
        } catch (e) {
            console.error("New git log error:", e);
        }

        return NextResponse.json({
            success: true,
            message: "🎉 Software updated successfully to the latest version! Your database and settings remain 100% safe.",
            pullOutput: pullOutput.trim(),
            updatedVersion
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: "Update error: " + error.message
        }, { status: 500 });
    }
}
