# Link Control Extensibility Test Plugin

This test plugin demonstrates and tests the new link control extensibility features in Gutenberg.

## What it provides

- **NoFollow Toggle**: Adds a toggle control to set `rel="nofollow"` on links
- **SEO Controls Section**: Groups SEO-related link controls with proper styling
- **Feature Flag**: Automatically enables the `linkControlExtensibility` setting

## How it works

The plugin uses the experimental Link Control extensibility API:

1. **`__experimentalLinkControlEditorFill`**: Registers custom UI components
2. **`__experimentalUseLinkControlEditorContext`**: Accesses link and block data
3. **Block attributes**: Modifies the `rel` attribute on blocks containing links

## Testing

### Unit Tests
```bash
npm run test:unit packages/block-editor/src/components/link-control/test/
```

### E2E Tests
```bash
npm run test:e2e test/e2e/specs/editor/blocks/links.spec.js -- --grep "Link Control Extensibility"
```

## Key Features Tested

1. ✅ **Settings drawer appears only when editing links**
2. ✅ **Toggle modifies block attributes correctly**
3. ✅ **Changes persist after save & reload**
4. ✅ **Keyboard accessibility maintained**
5. ✅ **Backwards compatibility with existing settings**

## Usage Example

When the plugin is active:

1. Create a paragraph block
2. Add some text and create a link
3. Click the "Edit" button on the link
4. Click "Advanced" to open the settings drawer
5. Toggle "Add nofollow to link" under "SEO Options"
6. Save the link

The resulting HTML will include `rel="nofollow"` on the link element.

## Code Structure

- `link-control-extensibility.php`: Plugin registration and feature flag
- `link-control-extensibility.js`: React components using the extensibility API
- `link-control-extensibility.asset.php`: Build dependencies for the JavaScript
