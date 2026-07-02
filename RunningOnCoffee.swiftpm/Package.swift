// swift-tools-version: 5.9

import PackageDescription
import AppleProductTypes

let package = Package(
    name: "RunningOnCoffee",
    platforms: [
        .iOS("16.0")
    ],
    products: [
        .iOSApplication(
            name: "RunningOnCoffee",
            targets: ["AppModule"],
            bundleIdentifier: "com.mareikejens.runningoncoffee",
            teamIdentifier: "",
            displayVersion: "1.0",
            bundleVersion: "1",
            accentColor: .presetColor(.brown),
            supportedDeviceFamilies: [
                .pad
            ],
            supportedInterfaceOrientations: [
                .portrait,
                .landscapeRight,
                .landscapeLeft
            ]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            path: "Sources"
        )
    ]
)
