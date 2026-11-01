# Deploying to PythonAnywhere (free, no credit card)

## 1. Create your account
Go to https://www.pythonanywhere.com/registration/register/beginner/
Sign up with your email - no card needed for the free "Beginner" account.

## 2. Upload your files
Once logged in, click the **Files** tab (top menu).
- Create a new folder: click "New directory", name it `acdsf`
- Go into that folder, and upload these 4 files (drag-and-drop or the "Upload a file" button):
  - `app.py`
  - `topology.json`
  - `knowledge_graph.gpickle.json`
  - `requirements.txt`

## 3. Install dependencies
Click the **Consoles** tab -> "Bash" (starts a new terminal in your browser).
Run:
```
cd acdsf
pip install --user -r requirements.txt
```
Wait for it to finish (a minute or two).

## 4. Create the web app
Click the **Web** tab -> "Add a new web app".
- Click Next (accept the free domain, something like `yourusername.pythonanywhere.com`)
- Choose **Flask** as the framework
- Choose the Python version shown as default (3.10 or similar)
- It'll ask for the path to your Flask app - navigate to `/home/yourusername/acdsf/app.py`

## 5. Point it at your actual app.py
PythonAnywhere auto-generates a WSGI config file. Click the link to it (something
like `/var/www/yourusername_pythonanywhere_com_wsgi.py`) and replace its contents with:

```python
import sys
path = '/home/YOURUSERNAME/acdsf'
if path not in sys.path:
    sys.path.insert(0, path)

from app import app as application
```
(Replace YOURUSERNAME with your actual PythonAnywhere username - shown top-right of the dashboard)

Save the file.

## 6. Reload and test
Back on the **Web** tab, click the big green **Reload** button.
Then visit: `https://yourusername.pythonanywhere.com/health`

You should see: `{"kg_nodes":243,"nodes_blocked":0,"sdn_nodes":43,"status":"ACDSF unified backend running"}`

That URL is your real, public, always-on backend - no more localhost.

## 7. Update your frontend to use this URL
In your React app's `src/api.js`, change these lines:
```js
export const DIGITAL_TWIN_URL = "https://yourusername.pythonanywhere.com";
export const SDN_URL = "https://yourusername.pythonanywhere.com/sdn";
export const KG_URL = "https://yourusername.pythonanywhere.com/kg";
```
(Note the `/sdn` and `/kg` prefixes now, since everything is one app)

You'll also need to update the endpoint paths in `api.js` slightly since twins are
now at `/twins` directly on the base URL - if anything breaks, paste the error and
I'll fix the exact lines.
