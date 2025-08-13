import os
from fastapi.testclient import TestClient
from main import app

def test_health():
    client = TestClient(app)
    r = client.get('/health')
    assert r.status_code == 200
    assert r.json()['status'] == 'ok'

def test_deep_health():
    client = TestClient(app)
    r = client.get('/health/deep')
    assert r.status_code == 200
    assert r.json()['llm'] == 'ready'
