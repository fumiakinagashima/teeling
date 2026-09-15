import { describe, it, expect } from 'vitest';
import { generatePowerpointPresentation } from './powerpoint';
import { extractZipText } from './test-utils';

describe('generatePowerpointPresentation', () => {
	it('generates a valid pptx with Japanese content', async () => {
		const buffer = await generatePowerpointPresentation({
			title: 'Proposal',
			slides: [
				{
					title: 'Benefits',
					body: ['Reduces work hours', 'Prevents input errors']
				},
				{
					title: 'Pricing Plan',
					table: {
						columns: [
							{ key: 'plan', label: 'Plan Name' },
							{ key: 'price', label: 'Price' }
						],
						rows: [{ plan: 'Standard', price: '$50,000' }]
					}
				}
			]
		});

		const bytes = new Uint8Array(buffer);
		expect(bytes[0]).toBe(0x50);
		expect(bytes[1]).toBe(0x4b);

		const text = await extractZipText(buffer);
		expect(text).toContain('Proposal');
		expect(text).toContain('Benefits');
		expect(text).toContain('Plan Name');
	});
});
