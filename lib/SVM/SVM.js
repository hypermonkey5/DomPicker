const spawn = require('child_process').spawn

class SVM{
	constructor(pyfile,modelfile){
		this.pyFile = pyfile
		this.modelFile = modelfile
	}

	setPyFile(pyfile){
		this.pyFile = pyfile
	}

	setModelFile(modelfile){
		this.modelFile = modelfile
	}

	predict(x,dim=7){
		return new Promise((solve)=>{
			const pyProcess = spawn('python', [this.pyFile,this.modelFile,x.toString(),dim])
			pyProcess.stdout.on('data', (result)=>{
				result = (result.toString()).split(',')
				result = result.map((value)=>{
					return parseInt(value)
				})

				solve(result)
			})
		})
	}
}

module.exports = SVM