/**
 * Editor side of Background Blur Control.
 *
 * Adds a "Backdrop blur" control next to the background color setting of
 * supported blocks and previews the effect in the editor. The front-end style is added by PHP at
 * render time, so nothing extra is saved into post content.
 */
import { addFilter } from '@wordpress/hooks';
import { getBlockSupport } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { RangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const settings = window.backgroundBlurControl || {};
const SUPPORTED_BLOCKS = settings.blocks || [];
const MAX_BLUR = settings.max || 50;

const isSupported = ( name ) => SUPPORTED_BLOCKS.includes( name );

// Blocks that support background gradients show background color in the
// Background panel; the rest keep it in the Color panel. Put the control
// next to wherever background color is.
const panelFor = ( name ) =>
	getBlockSupport( name, [ 'background', 'gradient' ] )
		? 'background'
		: 'color';

const blurStyle = ( blur ) => ( {
	backdropFilter: `blur(${ blur }px)`,
	WebkitBackdropFilter: `blur(${ blur }px)`,
} );

addFilter(
	'blocks.registerBlockType',
	'background-blur-control/add-attribute',
	( blockSettings, name ) => {
		if ( ! isSupported( name ) ) {
			return blockSettings;
		}

		const attributes = {
			...blockSettings.attributes,
			backgroundBlur: {
				type: 'number',
				default: 0,
			},
		};

		// Version 1.0.0 saved the blur as an inline style. This deprecation
		// recognises that markup so those blocks migrate without a recovery
		// prompt. The marker attribute exists only on this deprecation, so the
		// extraProps filter below can tell a legacy save from a current one.
		const legacy = {
			attributes: {
				...attributes,
				backgroundBlurLegacy: { type: 'boolean', default: true },
			},
			supports: blockSettings.supports,
			save: blockSettings.save,
			migrate: ( { backgroundBlurLegacy, ...rest } ) => rest,
		};

		return {
			...blockSettings,
			attributes,
			deprecated: [ legacy, ...( blockSettings.deprecated || [] ) ],
		};
	}
);

addFilter(
	'blocks.getSaveContent.extraProps',
	'background-blur-control/legacy-save',
	( props, blockType, attributes ) => {
		if (
			! attributes.backgroundBlurLegacy ||
			! attributes.backgroundBlur
		) {
			return props;
		}

		return {
			...props,
			style: {
				...props.style,
				...blurStyle( attributes.backgroundBlur ),
			},
		};
	}
);

const withBlurControl = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		const { name, attributes, setAttributes, isSelected } = props;

		if ( ! isSupported( name ) ) {
			return <BlockEdit { ...props } />;
		}

		const blur = attributes.backgroundBlur || 0;

		return (
			<>
				<BlockEdit { ...props } />
				{ isSelected && (
					<InspectorControls group={ panelFor( name ) }>
						<div
							className="background-blur-control"
							style={ { gridColumn: '1 / -1', marginTop: '8px' } }
						>
							<RangeControl
								__nextHasNoMarginBottom
								__next40pxDefaultSize
								label={ __(
									'Backdrop blur',
									'background-blur-control'
								) }
								help={ __(
									'Blurs whatever sits behind the block. Works best with a semi-transparent background color.',
									'background-blur-control'
								) }
								value={ blur }
								onChange={ ( value ) =>
									setAttributes( {
										backgroundBlur: value || 0,
									} )
								}
								min={ 0 }
								max={ MAX_BLUR }
								step={ 1 }
							/>
						</div>
					</InspectorControls>
				) }
			</>
		);
	},
	'withBlurControl'
);

addFilter(
	'editor.BlockEdit',
	'background-blur-control/with-blur-control',
	withBlurControl
);

const withEditorBlurStyles = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		const { name, attributes, wrapperProps } = props;
		const blur = attributes?.backgroundBlur;

		if ( ! isSupported( name ) || ! blur ) {
			return <BlockListBlock { ...props } />;
		}

		return (
			<BlockListBlock
				{ ...props }
				wrapperProps={ {
					...wrapperProps,
					style: { ...wrapperProps?.style, ...blurStyle( blur ) },
				} }
			/>
		);
	},
	'withEditorBlurStyles'
);

addFilter(
	'editor.BlockListBlock',
	'background-blur-control/with-editor-blur-styles',
	withEditorBlurStyles
);
