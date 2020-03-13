module.exports = {
	entry: './index.js',
	mode: 'production',
	output: {
		filename: 'bundle.js',
	},
	module: {
		rules: [
			{
				test: /\.(png|svg|jpg|gif)$/,
				use: ['file-loader'],
			},
		],
	},
};