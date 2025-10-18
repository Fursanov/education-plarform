import { useEffect, useRef, useState } from "react";

function FullscreenImage({ src }) {
    const imgRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [start, setStart] = useState({ x: 0, y: 0 });

    const handleWheel = (e) => {
        e.preventDefault();
        let newScale = scale + (e.deltaY < 0 ? 0.1 : -0.1);
        newScale = Math.min(Math.max(newScale, 0.5), 3);
        setScale(newScale);
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        setDragging(true);
        setStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        setPos({ x: e.clientX - start.x, y: e.clientY - start.y });
    };

    const handleMouseUp = () => setDragging(false);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [dragging, start]);

    return (
        <img
            ref={imgRef}
            src={src}
            alt="Полноэкранное изображение"
            className="chat__modal-image"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                cursor: dragging ? 'grabbing' : 'grab'
            }}
            onClick={e => e.stopPropagation()}
        />
    );
}

export default FullscreenImage
