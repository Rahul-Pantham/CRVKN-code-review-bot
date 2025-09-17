import urllib.request, urllib.parse, json

url_token = 'http://127.0.0.1:8000/token'
data = urllib.parse.urlencode({'username':'ci_test_user','password':'ci_test_pass'}).encode()
req = urllib.request.Request(url_token, data=data, headers={'Content-Type':'application/x-www-form-urlencoded'})
try:
    resp = urllib.request.urlopen(req, timeout=5)
    tok = json.loads(resp.read().decode())['access_token']
except Exception as e:
    print('Token error', e)
    raise SystemExit(1)

url = 'http://127.0.0.1:8000/past-reviews/8'
req = urllib.request.Request(url, headers={'Authorization': f'Bearer {tok}'})
try:
    resp = urllib.request.urlopen(req, timeout=10)
    print(resp.read().decode())
except Exception as e:
    print('ERROR', e)
