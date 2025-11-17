import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: ['class'],
    content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
  	extend: {
  		colors: {
  			purple: {
  				DEFAULT: '#673ab7',
  				light: '#9575cd',
  				dark: '#512da8',
  				'5': '#f3f0ff',
  				'10': '#e8e0ff',
  				'50': '#f3e5f5',
  				'100': '#e1bee7'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			surface: 'var(--gform-color-surface)',
  			'surface-alt': 'var(--gform-color-surface-alt)',
  			'surface-elevated': 'var(--gform-color-surface-elevated)',
  			success: {
  				DEFAULT: 'var(--gform-color-success)',
  				bg: 'var(--gform-color-success-bg)'
  			},
  			warning: {
  				DEFAULT: 'var(--gform-color-warning)',
  				bg: 'var(--gform-color-warning-bg)'
  			},
  			error: {
  				DEFAULT: 'var(--gform-color-error)',
  				bg: 'var(--gform-color-error-bg)'
  			},
  			info: {
  				DEFAULT: 'var(--gform-color-info)',
  				bg: 'var(--gform-color-info-bg)'
  			}
  		},
  		boxShadow: {
  			'elevation-1': 'var(--gform-elevation-1)',
  			'elevation-2': 'var(--gform-elevation-2)',
  			'elevation-3': 'var(--gform-elevation-3)',
  			'elevation-lifted': 'var(--gform-elevation-lifted)',
  			'focus-ring': 'var(--gform-focus-ring)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			card: 'var(--gform-radius-card)',
  			control: 'var(--gform-radius-control)',
  			modal: 'var(--gform-radius-modal)'
  		},
  		fontSize: {
  			xs: 'var(--gform-font-size-xs)',
  			sm: 'var(--gform-font-size-sm)',
  			base: 'var(--gform-font-size-base)',
  			lg: 'var(--gform-font-size-lg)',
  			xl: 'var(--gform-font-size-xl)',
  			'2xl': 'var(--gform-font-size-2xl)',
  			'3xl': 'var(--gform-font-size-3xl)',
  			display: ['48px', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '700' }],
  			title: ['32px', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '700' }],
  			subtitle: ['24px', { lineHeight: '1.25', fontWeight: '600' }],
  			heading: ['20px', { lineHeight: '1.5', fontWeight: '600' }],
  			body: ['16px', { lineHeight: '1.6', fontWeight: '400' }],
  			caption: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
  			label: ['14px', { lineHeight: '1.5', fontWeight: '500' }]
  		},
  		fontFamily: {
  			display: 'var(--gform-font-family-display)',
  			body: 'var(--gform-font-family-body)',
  			mono: 'var(--gform-font-family-mono)',
  			sans: 'var(--gform-font-family-body)'
  		},
  		fontWeight: {
  			regular: 'var(--gform-font-weight-regular)',
  			medium: 'var(--gform-font-weight-medium)',
  			semibold: 'var(--gform-font-weight-semibold)',
  			bold: 'var(--gform-font-weight-bold)'
  		},
  		lineHeight: {
  			tight: 'var(--gform-line-height-tight)',
  			normal: 'var(--gform-line-height-normal)',
  			relaxed: 'var(--gform-line-height-relaxed)'
  		},
  		letterSpacing: {
  			tight: 'var(--gform-letter-spacing-tight)',
  			normal: 'var(--gform-letter-spacing-normal)'
  		},
  		spacing: {
  			'1': 'var(--gform-space-1)',
  			'2': 'var(--gform-space-2)',
  			'3': 'var(--gform-space-3)',
  			'4': 'var(--gform-space-4)',
  			'5': 'var(--gform-space-5)',
  			'6': 'var(--gform-space-6)',
  			'8': 'var(--gform-space-8)',
  			'12': 'var(--gform-space-12)',
  			'16': 'var(--gform-space-16)',
  			'24': 'var(--gform-space-24)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")]
}

export default config

