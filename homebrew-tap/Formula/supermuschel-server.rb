class SupermushelServer < Formula
  desc "Supermuschel headless web server — AI agent runner with tiered sandboxing"
  homepage "https://github.com/karma-works/supermuschel"
  version "0.1.0"
  license "MIT"

  on_linux do
    on_arm do
      url "https://github.com/karma-works/supermuschel/releases/download/v#{version}/supermuschel-server-linux-arm64.tar.gz"
      sha256 "4710d8846a89ea17f56d59bf1050fcd2b7029ed04fd24a6e8e65235d49ff888e"
    end
    on_intel do
      url "https://github.com/karma-works/supermuschel/releases/download/v#{version}/supermuschel-server-linux-x64.tar.gz"
      sha256 "9e8676a4743c7a11df54d4b35b133474223598968b88046ad63e85ede45b52ae"
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
