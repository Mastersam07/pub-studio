<div align="center">
<h1>
<img src="./assets/icon.png" alt="Pub Studio logo" width="250">

<b>Pub Studio</b>
</h1>

[![Version](https://img.shields.io/visual-studio-marketplace/v/Mastersam.pub-studio?style=for-the-badge&colorA=252525&colorB=0079CC)](https://marketplace.visualstudio.com/items?itemName=Mastersam.pub-studio)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/Mastersam.pub-studio?style=for-the-badge&colorA=252525&colorB=0079CC)](https://marketplace.visualstudio.com/items?itemName=Mastersam.pub-studio)

</div>

Pub Studio is a Visual Studio Code extension designed to simplify the management of Flutter/Dart packages and plugins directly within the editor. This extension provides a seamless experience for developers, allowing them to manage dependencies, run scripts, and view package information without leaving the editor.

## Features

- **Scripts Management**: Easily run common Flutter and Dart scripts.
- **Actions**: Add, update, or remove dependencies with ease.
- **Dependencies**: View and manage your project's dependencies and dev dependencies.
- **Integrated Pubspec Management**: Navigate to dependency definitions within the `pubspec.yaml` file.

## Installation

To install Pub Studio:

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Sidebar.
3. Search for `Pub Studio`.
4. Click on the `Install` button.

## Usage

### Sidebar Views

Pub Studio adds an icon to the VS Code sidebar. Clicking on this icon will open the Pub Studio panel, which includes sections for Scripts, Actions, Dependencies, and Dev Dependencies.

#### Scripts

- **Flutter Clean**.
- **Static Analysis**.
- **Dart Fix**: Applies fixes with `dart fix --apply`.
- **Dart Format**.

#### Actions

- Installs all dependencies.
- Add dependency(single or multiple).
- Add Dev Dependency(single or multiple).

#### Dependencies

- **View Dependencies**: Displays all project dependencies. Right-click on a dependency to update or remove it.
- **View Dev Dependencies**: Displays all dev dependencies. Right-click on a dev dependency to update or remove it.

## Commands

Pub Studio provides several commands accessible from the command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`):

- `Pub Studio: Install All Dependencies`
- `Pub Studio: Add Dependency`
- `Pub Studio: Add Dev Dependency`
- `Pub Studio: Update Dependency`
- `Pub Studio: Remove Dependency`

## Configuration

No additional configuration is required. Pub Studio reads from your `pubspec.yaml` file to provide information about your dependencies and scripts.

## Demonstration

### Managing Dependencies

<div align="center">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/i3nR5dfxI78?autoplay=1&mute=1" frameborder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

### Running Scripts

<div align="center">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/IiNp89YnDRg?autoplay=1&mute=1" frameborder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

### Adding Dependencies

<div align="center">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/V0zHUy6oXKI?autoplay=1&mute=1" frameborder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests for any enhancements or bug fixes.

## Star Our Repository

If you find Pub Studio useful, please consider starring our repository on GitHub! Your support helps us continue to improve the extension.

[![GitHub stars](https://img.shields.io/github/stars/Mastersam07/pub-studio?style=social)](https://github.com/Mastersam07/pub-studio/stargazers)

## License

This extension is licensed under the MIT License.

---

For detailed documentation and contribution guidelines, please visit the [GitHub repository](https://github.com/Mastersam07/pub-studio).
