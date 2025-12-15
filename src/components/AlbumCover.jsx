import { useImageStatus } from '../hooks/useImageStatus';

export default function AlbumCover({ src }) {
  const status = useImageStatus(src);

  return (
    <div className="album-cover-main">
      {status === 'loaded' && (
        <img
          src={src}
          className="album-cover-image fade-in"
          alt=""
        />
      )}
    </div>
  );
}