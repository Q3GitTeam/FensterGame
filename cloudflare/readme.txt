Auf dem Laptop (Spiele Server):

Zuerst:
    cloudflared service install
    sudo systemctl start cloudflared

Dann:
    cd ~
    mkdir .cloudflared
    // config.yml in dieses directory legen.

    cloudflared tunnel route dns controller-tunnel controller.qdreigaming.org
    cloudflared tunnel create controller-tunnel