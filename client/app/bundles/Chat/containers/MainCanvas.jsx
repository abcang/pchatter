import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import Immutable from 'immutable';

function cssColor(c) {
  return `rgb(${c.r},${c.g},${c.b})`;
}

class MainCanvas extends React.Component {
  static propTypes = {
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    paths: PropTypes.instanceOf(Immutable.Set).isRequired,
    style: PropTypes.instanceOf(Immutable.Map).isRequired,
    canvas: PropTypes.instanceOf(Immutable.Map).isRequired,
    previewCanvas: PropTypes.instanceOf(HTMLElement),
  };

  static defaultProps = {
    width: 2000,
    height: 2000,
    previewCanvas: null
  };

  componentDidMount() {
    requestAnimationFrame(this.redraw);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { width, height, paths } = this.props;
    if (width !== nextProps.width || height !== nextProps.height) {
      return true;
    }

    const pathDiff = nextProps.paths.subtract(paths);
    const refreshMainCanvas = pathDiff.size > 0;

    if (refreshMainCanvas) {
      const lastPath = paths.last();
      // 古いパスが変更された場合はredraw
      if (lastPath && lastPath.get('id') > pathDiff.first().get('id')) {
        requestAnimationFrame(this.redraw);
        return false;
      }

      requestAnimationFrame(() => {
        if (refreshMainCanvas) {
          this.drawPaths(pathDiff);
        }
        this.reflectOnPreviewCanvas();
      });
    }

    return false;
  }

  componentDidUpdate() {
    requestAnimationFrame(this.redraw);
  }

  // tempのスタイルの設定
  setCtxStyle(ctx, style) {
    if (!this.isDrawable()) {
      return;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cssColor(style.color);
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.color.a;
    ctx.globalCompositeOperation = style.type;
  }

  // パスを描画
  drawPathData(ctx, pathData) {
    if (!this.isDrawable()) {
      return;
    }

    const { width, height } = this.props;
    const [firstPoint, ...restPoint] = pathData;

    // 画面クリア
    ctx.clearRect(0, 0, width, height);

    // 線を引く
    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);
    for (const point of restPoint) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  drawPaths(paths) {
    for (const path of paths) {
      this.setCtxStyle(this.tempCtx, path.get('style').toJS());
      this.drawPathData(this.tempCtx, path.get('data').toJS());
      // 出力先のキャンバスに反映
      this.mainCtx.drawImage(this.tempCtx.canvas, 0, 0);
    }
  }

  // 親から呼ばれる
  drawTempPath = (tempPath) => {
    if (!this.isDrawable()) {
      return;
    }

    const { width, height, style } = this.props;

    if (tempPath.length > 0) {
      this.setCtxStyle(this.myCtx, style.toJS());
      this.drawPathData(this.myCtx, tempPath);
      this.reflectOnPreviewCanvas();
    } else {
      this.myCtx.clearRect(0, 0, width, height);
    }
  }

  isDrawable() {
    return this.tempCtx && this.mainCtx && this.myCtx;
  }

  // 画像にしてpreviewCanvasに反映
  reflectOnPreviewCanvas() {
    const { width, height, previewCanvas } = this.props;
    if (!previewCanvas || !this.isDrawable()) {
      return;
    }

    const previewWidth = previewCanvas.width;
    const previewHeight = previewCanvas.height;
    const ctx = previewCanvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, previewWidth, previewHeight);
    ctx.drawImage(this.mainCtx.canvas, 0, 0, width, height, 0, 0, previewWidth, previewHeight);
    ctx.drawImage(this.tempCtx.canvas, 0, 0, width, height, 0, 0, previewWidth, previewHeight);
  }

  redraw = () => {
    const { width, height, paths } = this.props;
    if (!this.isDrawable()) {
      return;
    }

    this.mainCtx.clearRect(0, 0, width, height);
    this.drawPaths(paths);
    this.reflectOnPreviewCanvas();
  }

  refCanvasCtx(target) {
    return (element) => {
      if (element) {
        this[`${target}Ctx`] = element.getContext('2d');
      } else {
        this[`${target}Ctx`] = null;
      }
    };
  }

  render() {
    const { width, height, canvas } = this.props;
    const style = {
      width,
      height,
      transform: `scale(${canvas.get('scale')}) translate(-${canvas.get('top')}px, -${canvas.get('left')}px)`
    };

    return (
      <div className="canvas-wrapper">
        <div className="canvas-back" style={style} />
        <canvas id="tempCanvas" width={width} height={height} ref={this.refCanvasCtx('temp')} />
        <canvas id="mainCanvas" width={width} height={height} ref={this.refCanvasCtx('main')} style={style} />
        <canvas id="myCanvas" width={width} height={height} ref={this.refCanvasCtx('my')} style={style} />
      </div>
    );
  }
}

function select(state, ownProps) {
  const $$canvasStore = state.$$canvasStore;

  return {
    style: $$canvasStore.get('style'),
    paths: $$canvasStore.get('paths'),
    canvas: $$canvasStore.get('canvas'),
  };
}

export default connect(select, null, null, { withRef: true })(MainCanvas);