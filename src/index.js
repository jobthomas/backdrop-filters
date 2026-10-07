/**
 * Adds a backdrop filter setting next to the background color of blocks.
 *
 * The value is stored in style.backdropFilter and rendered by PHP, so
 * nothing extra is saved into post content.
 */
import { addFilter } from '@wordpress/hooks';
import { getBlockSupport, hasBlockSupport } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls, useSettings } from '@wordpress/block-editor';
import { RangeControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const EFFECTS = {
	blur: {
		label: __( 'Blur', 'backdrop-filters' ),
		unit: 'px',
		max: 50,
		initial: 10,
	},
	brightness: {
		label: __( 'Brightness', 'backdrop-filters' ),
		unit: '%',
		max: 200,
		initial: 70,
	},
	contrast: {
		label: __( 'Contrast', 'backdrop-filters' ),
		unit: '%',
		max: 200,
		initial: 150,
	},
	grayscale: {
		label: __( 'Grayscale', 'backdrop-filters' ),
		unit: '%',
		max: 100,
		initial: 100,
	},
	'hue-rotate': {
		label: __( 'Hue', 'backdrop-filters' ),
		unit: 'deg',
		max: 360,
		initial: 90,
	},
	invert: {
		label: __( 'Invert', 'backdrop-filters' ),
		unit: '%',
		max: 100,
		initial: 100,
	},
	saturate: {
		label: __( 'Saturation', 'backdrop-filters' ),
		unit: '%',
		max: 300,
		initial: 180,
	},
	sepia: {
		label: __( 'Sepia', 'backdrop-filters' ),
		unit: '%',
		max: 100,
		initial: 100,
	},
};

// Blocks with a background color, unless the block supports the filter natively.
const isSupported = ( name ) =>
	hasBlockSupport( name, 'color' ) &&
	getBlockSupport( name, [ 'color', 'background' ] ) !== false &&
	! hasBlockSupport( name, 'backdropFilter' );

// Blocks such as Button and Table put their background (and border radius)
// on an inner element. PHP works these out from block.json selectors and
// passes them in, so the preview and the front end target the same element.
const TARGETS = window.backdropFilters?.targets ?? {};

// Same whitelist as the PHP renderer, so the preview matches the front end.
const NUMBER = '\\d{1,3}(?:\\.\\d{1,2})?';
const FUNCTION = `(?:blur\\(${ NUMBER }px\\)|(?:brightness|contrast|grayscale|invert|opacity|saturate|sepia)\\(${ NUMBER }%\\)|hue-rotate\\(-?${ NUMBER }deg\\))`;
const VALID = new RegExp( `^${ FUNCTION }(?: ${ FUNCTION })*$` );
const PRESET = /^var:preset\|backdrop-filter\|([a-z0-9-]+)$/;

const toCSS = ( value ) => {
	if ( typeof value !== 'string' ) {
		return undefined;
	}
	if ( PRESET.test( value ) ) {
		return value.replace(
			PRESET,
			'var(--wp--preset--backdrop-filter--$1)'
		);
	}
	return VALID.test( value ) ? value : undefined;
};

const withControl = createHigherOrderComponent(
	( BlockEdit ) => ( props ) => {
		const { name, attributes, setAttributes, isSelected } = props;
		// WordPress 7.1 moved background color into the Background panel,
		// together with the background.gradient setting.
		const [ backgroundGradient ] = useSettings( 'background.gradient' );

		if ( ! isSelected || ! isSupported( name ) ) {
			return <BlockEdit { ...props } />;
		}

		const stored = attributes.style?.backdropFilter;
		const value = typeof stored === 'string' ? stored : undefined;
		const [ , fn, amount ] =
			/^([a-z-]+)\(([\d.]+)[a-z%]*\)$/.exec( value ?? '' ) ?? [];
		const effect = EFFECTS[ fn ];
		const panel = backgroundGradient === undefined ? 'color' : 'background';
		const isCustom = !! value && ! effect;

		const update = ( backdropFilter ) => {
			const { backdropFilter: _, ...style } = attributes.style ?? {};
			const next = backdropFilter ? { ...style, backdropFilter } : style;
			setAttributes( {
				style: Object.keys( next ).length ? next : undefined,
			} );
		};

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls group={ panel }>
					<div
						style={ {
							gridColumn: '1 / -1',
							// Match the 16px gap between items in other panels.
							marginTop: panel === 'background' ? '16px' : 0,
						} }
					>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __(
								'Backdrop filter',
								'backdrop-filters'
							) }
							help={
								isCustom
									? value
									: __(
											'Filters whatever sits behind the block. Needs a semi-transparent background.',
											'backdrop-filters'
										)
							}
							value={ isCustom ? 'custom' : ( fn ?? '' ) }
							options={ [
								{
									label: __( 'None', 'backdrop-filters' ),
									value: '',
								},
								...( isCustom
									? [
											{
												label: __(
													'Custom',
													'backdrop-filters'
												),
												value: 'custom',
												disabled: true,
											},
										]
									: [] ),
								...Object.entries( EFFECTS ).map(
									( [ key, { label } ] ) => ( {
										label,
										value: key,
									} )
								),
							] }
							onChange={ ( key ) =>
								update(
									key &&
										`${ key }(${ EFFECTS[ key ].initial }${ EFFECTS[ key ].unit })`
								)
							}
						/>
						{ effect && (
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Amount', 'backdrop-filters' ) }
								value={ Number( amount ) }
								min={ 0 }
								max={ effect.max }
								onChange={ ( next ) =>
									update(
										`${ fn }(${ next ?? 0 }${
											effect.unit
										})`
									)
								}
							/>
						) }
					</div>
				</InspectorControls>
			</>
		);
	},
	'withBackdropFilterControl'
);

addFilter( 'editor.BlockEdit', 'backdrop-filters/control', withControl );

const withPreview = createHigherOrderComponent(
	( BlockListBlock ) => ( props ) => {
		const css = toCSS( props.attributes?.style?.backdropFilter );

		if ( ! css || ! isSupported( props.name ) ) {
			return <BlockListBlock { ...props } />;
		}

		const declarations = `backdrop-filter:${ css };-webkit-backdrop-filter:${ css }`;
		const targets = TARGETS[ props.name ] ?? [];

		if ( targets.length ) {
			// Scope each block.json selector to this block: its first part is
			// the block wrapper, e.g. "#block-1.wp-block-search .wp-block-search__input".
			const id = `#block-${ props.clientId }`;
			const selector = targets
				.map( ( part ) =>
					part.startsWith( '.' ) ? id + part : `${ id } ${ part }`
				)
				.join( ',' );
			return (
				<>
					<style>{ `${ selector }{${ declarations }}` }</style>
					<BlockListBlock { ...props } />
				</>
			);
		}

		return (
			<BlockListBlock
				{ ...props }
				wrapperProps={ {
					...props.wrapperProps,
					style: {
						...props.wrapperProps?.style,
						backdropFilter: css,
						WebkitBackdropFilter: css,
					},
				} }
			/>
		);
	},
	'withBackdropFilterPreview'
);

addFilter( 'editor.BlockListBlock', 'backdrop-filters/preview', withPreview );
