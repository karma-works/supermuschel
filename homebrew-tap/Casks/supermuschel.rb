cask "supermuschel" do
  version "0.1.0"
  sha256 arm:   "06965948748f2f9b39d4f1e4800c6bd3ce451f4848fb23d7a1fc36c7114c057b",
         intel: "1acff9d1c8676892ec764a6ed3309fca7361b78a8d61f5852e8634f9915e703c"

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
