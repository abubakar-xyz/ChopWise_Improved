from fastapi.testclient import TestClient
from main import app

def test_chat_price_flow():
    client = TestClient(app)
    payload = {
        "session_id": None,
        "messages": [
            {"user": "price of rice in Ikeja", "bot": ""}
        ]
    }
    r = client.post('/api/chat', json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert 'reply' in data and data['reply'], data
