import urllib.request
import urllib.parse
import urllib.error

url = 'http://127.0.0.1:8000/token'
data = urllib.parse.urlencode({'username':'ci_test_user','password':'ci_test_pass'}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type':'application/x-www-form-urlencoded'})
try:
    resp = urllib.request.urlopen(req, timeout=5)
    print(resp.read().decode())
except urllib.error.HTTPError as e:
    print('HTTP', e.code)
    try:
        print(e.read().decode())
    except Exception:
        pass
except Exception as e:
    print('ERROR', str(e))
