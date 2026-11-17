/* Editor del bloque «Botón de Imagina Menu». Sin build: usa los globales de WordPress. */
( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var bp = wp.blockEditor;
	wp.blocks.registerBlockType( 'imagina-menu/toggle', {
		edit: function ( props ) {
			var label = props.attributes.label;
			return el(
				wp.element.Fragment,
				null,
				el(
					bp.InspectorControls,
					null,
					el(
						wp.components.PanelBody,
						{ title: __( 'Botón', 'imagina-menu' ) },
						el( wp.components.TextControl, {
							label: __( 'Texto (opcional)', 'imagina-menu' ),
							help: __( 'Sin texto se muestra solo el icono; el nombre accesible es «Abrir menú».', 'imagina-menu' ),
							value: label,
							onChange: function ( v ) { props.setAttributes( { label: v } ); },
						} )
					)
				),
				el(
					'button',
					bp.useBlockProps( { type: 'button', className: 'imm-toggle', style: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 0, padding: '8px', font: 'inherit', color: 'inherit' } } ),
					el( 'svg', { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
						el( 'path', { d: 'M4 6h16M4 12h16M4 18h16' } ) ),
					label ? el( 'span', null, label ) : null
				)
			);
		},
		save: function () { return null; },
	} );
} )( window.wp );
