/**
 * Seed script for AI judgment / metrics precision testing.
 * Creates approval requests covering all dataQuality tiers (high/medium/low)
 * and the "insufficient" case, so you can verify the AI's extraction accuracy.
 *
 * Usage:
 *   bun run db:seed:demo
 *
 * Requires wrangler dev to have been run at least once (creates local D1 SQLite).
 */

import { createClient } from '@libsql/client';
import { readdirSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const d1Dir = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const sqliteFile = readdirSync(d1Dir).find(
	(f) => f.endsWith('.sqlite') && !f.includes('metadata')
);
if (!sqliteFile) {
	console.error('Local D1 SQLite file not found. Run `wrangler dev` first.');
	process.exit(1);
}

const db = createClient({ url: `file:${resolve(d1Dir, sqliteFile)}` });

// Use the admin account ID from the seeded DB
const ADMIN_ID = '7be7f4d2-ca94-453e-807c-3bf0b3aa4202';
const GENERAL_ID = 'ac576c3a-dee8-4ea0-9257-935c6ce76c3d';

type ApprovalSeed = {
	title: string;
	type: string;
	status: 'pending' | 'approved' | 'rejected' | 'draft';
	submittedBy: string;
	content: string;
	route: { step: number; approver: string; role?: string; email?: string }[];
	/** Expected AI metrics dataQuality — for human reference only */
	_expectedQuality: 'high' | 'medium' | 'low' | 'insufficient';
};

const seeds: ApprovalSeed[] = [
	// ─── HIGH data quality ────────────────────────────────────────────────────
	{
		title: 'Salesforce Sales Cloud Implementation Request',
		type: 'IT Systems Request',
		status: 'pending',
		submittedBy: ADMIN_ID,
		_expectedQuality: 'high',
		content: `## Request Summary
Requesting implementation of Salesforce Sales Cloud to consolidate deal management and sales progress tracking across the sales department, eliminating reliance on individual knowledge.

## Cost
- License fee: ¥6,000/month per user × 20 users = ¥120,000/month (¥1,440,000/year)
- Initial implementation & setup fee (external vendor): ¥800,000 (one-time)
- First-year total: ¥2,240,000

## Expected Benefits
- Deal-tracking workload per sales rep reduced from 4 hours/week to 1 hour/week (3 hours × 20 reps = 60 hours/week saved)
- At an average hourly rate of ¥3,500: annual savings = 3,500 × 60 × 52 = ¥10,920,000
- Improved close rate from better deal visibility: target improvement from current 12% to 15% (+3 points)
  - 150 deals/month × 3% = 4.5 additional deals; average deal value ¥450,000 × 4.5 = ¥2,025,000/month
  - Annual revenue contribution: ¥24,300,000

## ROI Estimate
- Year 1 benefit: ¥10,920,000 (labor savings) + ¥24,300,000 (revenue increase) = ¥35,220,000
- Year 1 cost: ¥2,240,000
- ROI: (¥35,220,000 − ¥2,240,000) ÷ ¥2,240,000 ≈ 1,472%
- Payback period: ¥2,240,000 ÷ ¥2,935,000/month ≈ 0.8 months (about 24 days)

## Risks
- If adoption is low, the close-rate improvement may not materialize (considering an additional ¥200,000 for onboarding training)`,
		route: [
			{ step: 1, approver: 'Sales Director', role: 'Director', email: 'sales-mgr@example.com' },
			{ step: 2, approver: 'Corporate Planning Office', role: 'Manager' },
			{ step: 3, approver: 'CEO', role: 'CEO' }
		]
	},
	{
		title: 'Warehouse Logistics Outsourcing Request',
		type: 'Procurement / Outsourcing Request',
		status: 'pending',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'high',
		content: `## Background
Warehouse picking and packing is currently handled by 5 full-time employees (including overtime). Overtime costs are high during the peak season, and utilization falls below 60% in the off-season. Switching to outsourcing would convert fixed costs into variable costs and optimize overall cost.

## Current Cost
- Full-time employee labor cost (including salary, social insurance, and retirement contributions): 5 employees × ¥4,800,000/person/year = ¥24,000,000/year
- Overtime cost (3 peak-season months): average ¥280,000/month × 3 months × 5 employees = ¥4,200,000/year
- Current total: ¥28,200,000/year

## Estimated Cost After Outsourcing
- Base outsourcing fee: ¥1,600,000/month (¥19,200,000/year)
- Peak-season surcharge (3 months): ¥400,000/month × 3 = ¥1,200,000
- Total after outsourcing: ¥20,400,000/year

## Cost Reduction Impact
- Annual savings: ¥28,200,000 − ¥20,400,000 = ¥7,800,000
- Reduction rate: 27.7%
- Initial transition cost (2-month parallel operation during handover): ¥3,200,000
- Payback period: ¥3,200,000 ÷ ¥650,000/month ≈ 5 months`,
		route: [
			{ step: 1, approver: 'Logistics Director', role: 'GM' },
			{ step: 2, approver: 'Finance Director', role: 'CFO' }
		]
	},

	// ─── MEDIUM data quality ──────────────────────────────────────────────────
	{
		title: 'Tokyo-Osaka Business Trip Request (Client Meeting)',
		type: 'Business Travel Request',
		status: 'pending',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'medium',
		content: `## Purpose of Trip
Meeting with Tech Partner Inc. (new service sales expansion). The client has requested an in-person meeting.

## Schedule
Thursday, July 10, 2026 - Friday, July 11, 2026 (1 night, 2 days)

## Cost Breakdown
| Item | Amount |
|------|------|
| Shinkansen (round trip) | ¥28,360 |
| Hotel (1 night) | ¥12,000 |
| Local transportation | ¥2,000 |
| Total | ¥42,360 |

## Meeting Details
Tech Partner Inc. is a SaaS vendor for the manufacturing industry with annual revenue of approximately ¥5 billion. They are considering a reseller partnership agreement for our product. If the contract is finalized, it is expected to contribute ongoing revenue.
(Contract size and close probability are undisclosed, as they are still under negotiation.)`,
		route: [{ step: 1, approver: 'Sales Manager', role: 'Manager' }]
	},
	{
		title: 'High-Performance Laptop Purchase Request for Dev Team',
		type: 'Equipment Purchase Request',
		status: 'pending',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'medium',
		content: `## Request Details
The existing PCs used by 3 development engineers are over 4 years old, and build/test execution times have grown, impacting productivity. Requesting an upgrade to laptops with the latest specs.

## Model & Cost
- Apple MacBook Pro 14-inch (M4 Pro, 32GB RAM, 512GB SSD)
- Unit price: ¥258,000 (tax included)
- Quantity: 3 units
- Total: ¥774,000

## Expected Benefits
- Build time reduced from an average of 8 minutes to an estimated 2 minutes (75% reduction expected)
- Average builds per day: 12 per person
- Time saved: 6 min/build × 12 builds × 3 people = 216 min/day ≈ 3.6 hours/day

(Hourly-rate conversion withheld per HR policy)`,
		route: [
			{ step: 1, approver: 'Development Director', role: 'Director' },
			{ step: 2, approver: 'General Affairs', role: 'Accounting' }
		]
	},

	// ─── LOW data quality ─────────────────────────────────────────────────────
	{
		title: 'Recruitment Branding SNS Campaign Request',
		type: 'Marketing Request',
		status: 'pending',
		submittedBy: ADMIN_ID,
		_expectedQuality: 'low',
		content: `## Background
Engineering recruitment suffers from low candidate awareness, resulting in ongoing high hiring costs. We want to strengthen our recruitment branding through social media (X / LinkedIn) to raise our employer brand.

## Proposed Activities
- Post tech-related content 2-3 times per week (in coordination with the engineering blog)
- Recruiting staff will manage the X and LinkedIn accounts
- Consider outsourcing article writing to an external writer if needed

## Goals
- Double follower count within 6 months
- Increase direct applications to the company
- Reduce cost per hire

## Budget & Cost
Details are not yet finalized. If an external writer is used, we estimate a few hundred thousand yen per month, but we plan to first try using internal resources.`,
		route: [
			{ step: 1, approver: 'HR Director', role: 'CHRO' },
			{ step: 2, approver: 'CEO', role: 'CEO' }
		]
	},
	{
		title: 'Corporate Website Renewal Proposal',
		type: 'Marketing Request',
		status: 'draft',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'low',
		content: `Our corporate website is starting to feel outdated. We'd like to renew the design to improve our impression with recruiting candidates and sales prospects.

Cost and schedule estimates are still being requested from vendors. We plan to submit a formal request once the details are finalized.`,
		route: [{ step: 1, approver: 'CEO', role: 'CEO' }]
	},

	// ─── INSUFFICIENT ─────────────────────────────────────────────────────────
	{
		title: 'New Project Request',
		type: 'Request',
		status: 'draft',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'insufficient',
		content: `Still under consideration. Will fill in the details later.`,
		route: [{ step: 1, approver: 'Director' }]
	},
	{
		title: 'Tool Adoption Request',
		type: 'Request',
		status: 'pending',
		submittedBy: GENERAL_ID,
		_expectedQuality: 'insufficient',
		content: `I'd like to start using a new tool. Please approve.`,
		route: [{ step: 1, approver: 'Admin User', role: 'Administrator' }]
	}
];

async function seed() {
	console.log('Seeding approval requests for AI metrics precision testing...\n');

	// Remove existing seed data (identified by a specific type prefix to avoid clobbering real data)
	// We'll just insert — duplicate runs create new IDs, which is fine for testing.

	for (const s of seeds) {
		const id = randomUUID();
		const now = Math.floor(Date.now() / 1000);
		const route = s.route.map((r, i) => ({
			...r,
			status: 'pending' as const,
			comment: null,
			actionAt: null,
			actionByAccountId: null
		}));
		const data = JSON.stringify({ content: s.content });

		await db.execute({
			sql: `INSERT INTO approval_requests (id, title, type, status, submitted_by, data, route, attachments, created_at, updated_at)
			      VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
			args: [id, s.title, s.type, s.status, s.submittedBy, data, JSON.stringify(route), now, now]
		});

		console.log(
			`✓ [${s._expectedQuality.padEnd(12)}] ${s.title}`
		);
	}

	console.log(`\nDone! ${seeds.length} approval requests created.`);
	console.log(
		'\nExpected AI judgment results:',
		'\n  high (×2)         → keyFigures populated, ROI + paybackPeriod calculated',
		'\n  medium (×2)       → some keyFigures, ROI/payback null (missing one side)',
		'\n  low (×2)          → keyFigures empty or minimal, dataQuality: "low"',
		'\n  insufficient (×2) → status: "insufficient"'
	);

	await db.close();
}

seed().catch((e) => {
	console.error(e);
	process.exit(1);
});
