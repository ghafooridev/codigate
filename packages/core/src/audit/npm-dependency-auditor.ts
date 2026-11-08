import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Finding, Severity } from '@codigate/domain';
import { DependencyAuditor } from '@codigate/application';

const execAsync = promisify(exec);

export class NpmDependencyAuditor implements DependencyAuditor {
    async audit(root: string): Promise<Finding[]> {
        try {
            await readFile(join(root, 'package.json'), 'utf8');
        } catch {
            return [infoFinding(
                'dep.audit.skipped',
                'Dependency audit skipped: not a Node project.'
            )];
        }

        const findings: Finding[] = [];

        try {
            findings.push(...vulnerabilityFindings(await capture('npm audit --json', root)));
        } catch (error) {
            findings.push(infoFinding(
                'dep.audit.failed',
                `npm audit failed: ${message(error)}`
            ));
        }

        try {
            findings.push(...outdatedFindings(await capture('npm outdated --json', root)));
        } catch (error) {
            findings.push(infoFinding(
                'dep.outdated.failed',
                `npm outdated failed: ${message(error)}`
            ));
        }

        return findings;
    }
}

function vulnerabilityFindings(raw: string): Finding[] {
    const parsed = parseJson(raw) as {
        vulnerabilities?: Record<string, {
            name?: string;
            severity?: string;
            via?: unknown[];
            fixAvailable?: boolean | { name?: string; version?: string };
        }>;
    } | undefined;
    const vulnerabilities = parsed?.vulnerabilities;

    if (!vulnerabilities) {
        return [];
    }

    return Object.values(vulnerabilities).map((entry) => {
        const name = entry.name ?? 'package';
        const via = entry.via?.find((item) => item && typeof item === 'object' && 'title' in item) as { title?: string } | undefined;
        const fix = typeof entry.fixAvailable === 'object' && entry.fixAvailable?.version
            ? `Upgrade to ${entry.fixAvailable.version}.`
            : 'Upgrade to a patched release or replace the package.';

        return {
            id: `dep.vuln.${name}`,
            ruleId: 'dep.vuln',
            category: 'dependencies' as const,
            severity: advisorySeverity(entry.severity),
            filePath: 'package.json',
            line: 1,
            message: `${name} has a ${entry.severity ?? 'known'} advisory${via?.title ? `: ${via.title}` : ''}`,
            explanation: 'A vulnerable dependency can be exploited through the application.',
            suggestion: fix,
        };
    });
}

function outdatedFindings(raw: string): Finding[] {
    const parsed = parseJson(raw) as Record<string, {
        current?: string;
        latest?: string;
        wanted?: string;
    }> | undefined;

    if (!parsed) {
        return [];
    }

    return Object.entries(parsed).flatMap(([name, entry]) => {
        if (!entry.current || !entry.latest || entry.current === entry.latest) {
            return [];
        }

        const behindMajor = major(entry.latest) > major(entry.current);

        return [{
            id: `dep.outdated.${name}`,
            ruleId: 'dep.outdated',
            category: 'dependencies' as const,
            severity: (behindMajor ? 'medium' : 'low') as Severity,
            filePath: 'package.json',
            line: 1,
            message: `${name} is outdated (${entry.current} → ${entry.latest})`,
            suggestion: `Upgrade ${name} to ${entry.wanted ?? entry.latest}.`,
        }];
    });
}

function advisorySeverity(value: string | undefined): Severity {
    if (value === 'critical' || value === 'high') {
        return 'high';
    }

    if (value === 'moderate' || value === 'medium') {
        return 'medium';
    }

    if (value === 'low') {
        return 'low';
    }

    return 'info';
}

function infoFinding(id: string, text: string): Finding {
    return {
        id,
        ruleId: id,
        category: 'dependencies',
        severity: 'info',
        filePath: 'package.json',
        line: 1,
        message: text,
        suggestion: 'Run the audit from a Node project with a package.json.',
    };
}

async function capture(command: string, cwd: string): Promise<string> {
    try {
        const { stdout } = await execAsync(command, {
            cwd,
            encoding: 'utf8',
            timeout: 60_000,
            maxBuffer: 20_000_000,
        });

        return stdout;
    } catch (error) {
        const stdout = (error as { stdout?: string }).stdout;

        if (stdout && stdout.trim().startsWith('{')) {
            return stdout;
        }

        throw error;
    }
}

function parseJson(raw: string): unknown {
    const start = raw.indexOf('{');

    if (start < 0) {
        return undefined;
    }

    try {
        return JSON.parse(raw.slice(start));
    } catch {
        return undefined;
    }
}

function major(version: string): number {
    const match = version.match(/\d+/);

    return match ? Number(match[0]) : 0;
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
