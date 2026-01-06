
export interface WikipediaSummary {
    title: string;
    extract: string;
    description: string;
    thumbnail?: {
        source: string;
        width: number;
        height: number;
    };
    content_urls?: {
        desktop: {
            page: string;
        };
    };
}

export async function fetchWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    console.log(`[WikiService] Fetching: ${url}`);
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'WorldGraph/1.0 (dev@worldgraph.app)'
            }
        });

        if (res.status === 404) {
            console.log(`[WikiService] 404 Not Found for: ${title}`);
            return null;
        }
        if (!res.ok) {
            console.warn(`[WikiService] Error for ${title}: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json();
        console.log(`[WikiService] Success for ${title}`);
        return data;
    } catch (err) {
        console.error(`[WikiService] Failed to fetch Wikipedia summary for ${title}:`, err);
        return null;
    }
}
