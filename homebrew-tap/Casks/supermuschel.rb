cask "supermuschel" do
  version "0.1.0"
  sha256 arm:   "PLACEHOLDER_ARM64_SHA256",
         intel: "PLACEHOLDER_X64_SHA256"

  url "https://github.com/supermuschel/supermuschel/releases/download/v#{version}/Supermuschel-#{version}-#{arch == :arm64 ? "arm64" : "x64"}.dmg"
  name "Supermuschel"
  desc "Electron desktop app for AI agents with tiered sandboxing"
  homepage "https://github.com/supermuschel/supermuschel"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "Supermuschel.app"

  zap trash: [
    "~/Library/Application Support/Supermuschel",
    "~/Library/Preferences/ai.supermuschel.desktop.plist",
    "~/Library/Saved Application State/ai.supermuschel.desktop.savedState",
    "~/Library/Logs/Supermuschel",
  ]
end
