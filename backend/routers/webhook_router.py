from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
import subprocess
import hmac
import hashlib
import os

router = APIRouter(tags=["webhook"])

# Optional: Set a secret in environment variable for security
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")

def verify_github_signature(payload: bytes, signature: str) -> bool:
    """Verify GitHub webhook signature if secret is configured."""
    if not WEBHOOK_SECRET:
        return True  # No secret configured, skip verification
    
    if not signature:
        return False
    
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

def run_deploy():
    """Run the deploy script in a fully detached process."""
    try:
        # Use Popen with start_new_session to fully detach the process.
        # This is necessary because the deploy script restarts this very service,
        # so we need the script to continue running independently.
        subprocess.Popen(
            ["/bin/bash", "/opt/incubatoio-manager/deploy/deploy.sh"],
            stdout=open("/tmp/deploy.log", "w"),
            stderr=subprocess.STDOUT,
            start_new_session=True,
            cwd="/opt/incubatoio-manager"
        )
        print("Deploy script started in detached process")
    except Exception as e:
        print(f"Deploy failed to start: {e}")

@router.post("/webhook/deploy")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    GitHub webhook endpoint for auto-deploy.
    Triggered on push to main branch.
    """
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify signature if secret is configured
    signature = request.headers.get("X-Hub-Signature-256", "")
    if WEBHOOK_SECRET and not verify_github_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse JSON payload
    try:
        payload = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Check if it's a push to main branch
    ref = payload.get("ref", "")
    if ref != "refs/heads/main":
        return {"status": "ignored", "reason": f"Not main branch: {ref}"}
    
    # Run deploy in background (don't block the response)
    background_tasks.add_task(run_deploy)
    
    return {
        "status": "deploying",
        "message": "Deploy started in background",
        "branch": "main"
    }
