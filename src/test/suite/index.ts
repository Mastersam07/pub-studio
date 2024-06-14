import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '.');

	try {
		const files = await glob('**/**.test.js', { cwd: testsRoot });

		// Add files to the test suite
		files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

		// Run the mocha test
		await new Promise<void>((resolve, reject) => {
			mocha.run(failures => {
				if (failures > 0) {
					reject(new Error(`${failures} tests failed.`));
				} else {
					resolve();
				}
			});
		});
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		throw new Error(`Error running tests: ${errorMessage}`);
	}
}