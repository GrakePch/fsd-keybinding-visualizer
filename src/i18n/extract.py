import json

prefixes = ["ui"]

# Load data from an input JSON file
with open("merged.json", "r", encoding="utf-8") as file:
    data = json.load(file)

filtered_data = {
    item["key"].lower(): {
        "key": item["key"],
        "en": item["original"],
        "zh_Hans": item["translation"]
    }
    for item in data
    if any(item.get("key", "").lower().startswith(prefix.lower()) for prefix in prefixes)
}
# Save the filtered data to a JSON file
with open("i18n.json", "w", encoding="utf-8") as file:
    json.dump(filtered_data, file, ensure_ascii=False, indent=2)
