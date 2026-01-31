---
description: Deploy changes to VPS production server
---
# Deploy to VPS

// turbo-all

## Steps

1. SSH into the server and run the deploy script:
```bash
ssh root@162.55.184.122 "bash /opt/incubatoio-manager/deploy.sh"
```

## Manual Steps (if script not available)

1. Connect via SSH:
```bash
ssh root@162.55.184.122
```

2. Navigate to project:
```bash
cd /opt/incubatoio-manager
```

3. Pull latest code:
```bash
git pull origin main
```

4. Build frontend (if changes):
```bash
cd frontend && npm run build && cd ..
```

5. Restart backend:
```bash
systemctl restart incubatoio
```

6. Verify:
```bash
systemctl status incubatoio
```

## Troubleshooting

Check logs if something goes wrong:
```bash
journalctl -u incubatoio -n 50
```
