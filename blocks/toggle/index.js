/* Editor del bloque «Botón de Imagina Menu». Sin build: usa los globales de WordPress. */
( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var bp = wp.blockEditor;
	wp.blocks.registerBlockType( 'imagina-menu/toggle', {
		edit: function ( props ) {
			var label = props.attributes.label;
			var style = props.attributes.style || '';
			var set = function ( key ) {
				return function ( v ) {
					var next = {};
					next[ key ] = v;
					props.setAttributes( next );
				};
			};
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
							onChange: set( 'label' ),
						} ),
						el( wp.components.SelectControl, {
							label: __( 'Estilo', 'imagina-menu' ),
							value: style,
							options: [
								{ value: '', label: __( 'Transparente (color de la cabecera)', 'imagina-menu' ) },
								{ value: 'solid', label: __( 'Relleno con el color de acento', 'imagina-menu' ) },
								{ value: 'outline', label: __( 'Con borde', 'imagina-menu' ) },
							],
							onChange: set( 'style' ),
						} ),
						el( wp.components.SelectControl, {
							label: __( 'Mostrar en', 'imagina-menu' ),
							help: __( 'Por ejemplo, un «☰ Todo» solo en la cabecera de escritorio. El ancho de corte está en Imagina Menu → Ajustes.', 'imagina-menu' ),
							value: props.attributes.only || '',
							options: [
								{ value: '', label: __( 'Celular y escritorio', 'imagina-menu' ) },
								{ value: 'desktop', label: __( 'Solo escritorio', 'imagina-menu' ) },
								{ value: 'mobile', label: __( 'Solo celular y tablet', 'imagina-menu' ) },
							],
							onChange: set( 'only' ),
						} )
					)
				),
				el(
					'button',
					bp.useBlockProps( {
						type: 'button',
						className: 'imm-toggle',
						style: {
							display: 'inline-flex',
							alignItems: 'center',
							gap: '8px',
							background: 'solid' === style ? 'var(--wp--preset--color--primary, #111)' : 'none',
							border: 0,
							boxShadow: 'outline' === style ? 'inset 0 0 0 1.5px currentColor' : 'none',
							borderRadius: style ? '8px' : 0,
							padding: style ? '8px 16px' : '8px',
							font: 'inherit',
							fontWeight: 600,
							color: 'solid' === style ? '#fff' : 'inherit',
						},
					} ),
					el( 'svg', { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
						el( 'path', { d: 'M4 6h16M4 12h16M4 18h16' } ) ),
					label ? el( 'span', null, label ) : null
				)
			);
		},
		save: function () { return null; },
	} );
} )( window.wp );
