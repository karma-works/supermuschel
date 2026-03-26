cask "supermuschel" do
  version "0.1.0"
  sha256 arm:   "46f280dc06b8c862e578d634f0af1da6ed75f8cbc6e06017fae25bd1056bbfd2",
         intel: "72abfc188097ff6db9da74e36847ce862830a974fe88fb26ae049294aee34b24"

  url "https://github.com/karma-works/supermuschel/releases/download/v#{version}/Supermuschel-#{version}#{arch == :arm64 ? "-arm64" : ""}.dmg"
  name "Supermuschel"
  desc "Electron desktop app for AI agents with tiered sandboxing"
  homepage "https://github.com/karma-works/supermuschel"

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
