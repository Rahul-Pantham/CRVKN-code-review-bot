import urllib.request, urllib.parse, json

# Get token
url_token = 'http://127.0.0.1:8000/token'
data = urllib.parse.urlencode({'username':'ci_test_user','password':'ci_test_pass'}).encode()
req = urllib.request.Request(url_token, data=data, headers={'Content-Type':'application/x-www-form-urlencoded'})
try:
    resp = urllib.request.urlopen(req, timeout=10)
    tok = json.loads(resp.read().decode())['access_token']
    print('Got token')
except Exception as e:
    print('Token error', e)
    raise SystemExit(1)

# Call generate-review
url = 'http://127.0.0.1:8000/generate-review'
payload = {'code': 'def add(a, b):\n    return a + b\n'}
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {tok}'})
try:
    resp = urllib.request.urlopen(req, timeout=30)
    print('Response:', resp.read().decode())
except Exception as e:
    try:
        # try to read response body
        import sys, traceback
        print('Error calling generate-review:', e)
    except:
        print('Error and could not read body')
