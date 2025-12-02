import json
import requests
from pathlib import Path

BACKEND_URL = "http://127.0.0.1:8000/api/v1/nodes"
DEMO_FILE = Path(__file__).parent / "nodes.json"


def load_nodes():
    with open(DEMO_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def upload_nodes(nodes):
    for node in nodes:
        response = requests.post(BACKEND_URL, json=node)
        if response.status_code not in (200, 201):
            print(f"Failed to create node: {response.status_code} → {response.text}")
            continue

        created = response.json()
        print(f"Created node id={created['id']} name=\"{created['name']}\"")


def main():
    nodes = load_nodes()
    print(f"Loaded {len(nodes)} nodes from demo file.")
    upload_nodes(nodes)


if __name__ == "__main__":
    main()
