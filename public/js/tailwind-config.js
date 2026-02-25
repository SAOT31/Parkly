/**
 * FILE: js/tailwind-config.js
 * DESCRIPCIÓN: Conecta las variables CSS con las clases de Tailwind.
 */
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))"
                },
                card: "hsl(var(--card))",
                border: "hsl(var(--border))",
                input: "hsl(var(--input))"
            },
            borderRadius: {
                xl: "var(--radius)",
            }
        }
    }
}