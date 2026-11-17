# Primer mensaje para Claude Code

Copia y pega esto en Claude Code, abierto en la carpeta del repositorio, cuando la planeación esté aprobada:

---

Lee CLAUDE.md y todos los archivos de docs/ antes de escribir código. Es la especificación completa del plugin, acordada en la etapa de planeación.

1. Resúmeme en pocas líneas qué entendiste del proyecto, las reglas no negociables (sobre todo el presupuesto de rendimiento) y las decisiones abiertas de docs/05-roadmap-y-pruebas.md con las respuestas que ya di.
2. Revisa el admin de augusto97/Imagina-Turbo (carpeta admin/: package.json, vite.config.ts, src/index.css, components/ui) y replica su base cambiando el prefijo a `imm`.
3. Propón el plan de archivos de la fase 0 (fundaciones) y espera mi confirmación.
4. Cualquier API del navegador (Popover, @starting-style, Speculation Rules) o filtro de LiteSpeed/WP Rocket/Perfmatters debe confirmarse en la documentación oficial vigente antes de usarse.

Trabaja en la rama fase-0-fundaciones y haz commits pequeños en español.
