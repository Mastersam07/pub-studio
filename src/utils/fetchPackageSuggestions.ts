import * as https from 'https';

export async function fetchPackageSuggestions(query: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'pub.dev',
            path: `/api/search?q=${query}`,
            method: 'GET'
        };

        const req = https.request(options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    const results = parsedData.packages.map((pkg: any) => pkg.package);
                    resolve(results);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', error => {
            reject(error);
        });

        req.end();
    });
}