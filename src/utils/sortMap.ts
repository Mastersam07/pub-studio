import { YAMLMap } from "yaml";

export function sortMapKeys(map: YAMLMap): YAMLMap {
    const sortedMap = new YAMLMap();
    const sortedKeys = map.items.sort((a, b) => {
        const keyA = String(a.key);
        const keyB = String(b.key);
        return keyA.localeCompare(keyB);
    });
    sortedMap.items = sortedKeys;
    return sortedMap;
}

