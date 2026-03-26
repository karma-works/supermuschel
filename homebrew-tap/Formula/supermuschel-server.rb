class SupermushelServer < Formula
  desc "Supermuschel headless web server — AI agent runner with tiered sandboxing"
  homepage "https://github.com/karma-works/supermuschel"
  version "0.1.0"
  license "MIT"

  on_linux do
    on_arm do
      url "https://github.com/karma-works/supermuschel/releases/download/v#{version}/supermuschel-server-linux-arm64.tar.gz"
      sha256 "567a5d2532b878dae6dc8756523081a4bb443dceda38ed9ff21d3484cbf7f53e"
    end
    on_intel do
      url "https://github.com/karma-works/supermuschel/releases/download/v#{version}/supermuschel-server-linux-x64.tar.gz"
      sha256 "e33090b45326ff8a869bbec09f4c3447c4aaa12b06346962676cdac3767b1d41"
    end
  end

  def install
    bin.install "supermuschel-server"
    pkgshare.install "web"

    # Write a wrapper that passes the bundled static dir by default
    (bin/"supermuschel").write <<~SH
      #!/bin/sh
      exec "#{bin}/supermuschel-server" \
        --static-dir "#{pkgshare}/web" \
        "$@"
    SH
    chmod 0755, bin/"supermuschel"
  end

  service do
    run [opt_bin/"supermuschel", "--port", "3000"]
    keep_alive true
    log_path var/"log/supermuschel.log"
    error_log_path var/"log/supermuschel.log"
    working_dir Dir.home
  end

  test do
    port = free_port
    pid = fork { exec bin/"supermuschel", "--port", port.to_s, "--workdir", testpath.to_s }
    sleep 2
    assert_match "OK", shell_output("curl -s http://localhost:#{port}/trpc/health")
  ensure
    Process.kill "TERM", pid
  end
end
