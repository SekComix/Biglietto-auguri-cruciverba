import React, { forwardRef } from 'react';
import { CrosswordData, CellData, Direction, ThemeType, CardFormat } from '../types';
import { Direction as DirEnum } from '../types'; 

// --- COMPONENTI DI SUPPORTO PER LA STAMPA ---

const getSolutionLabel = (index: number) => String.fromCharCode(64 + index);

const PhotoCollage: React.FC<{ photos: string[] }> = ({ photos }) => {
    if (!photos || photos.length === 0) return null;
    const count = photos.length;
    let gridClass = 'grid-cols-1';
    if (count === 2) gridClass = 'grid-cols-2';
    else if (count > 2 && count <= 4) gridClass = 'grid-cols-2';
    else if (count >= 5) gridClass = 'grid-cols-3';

    return (
        <div className={`grid gap-0.5 w-full h-full bg-white overflow-hidden ${gridClass}`}>
            {photos.map((p, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden">
                    <img src={p} className="w-full h-full object-cover" alt={`mem-${i}`} />
                </div>
            ))}
        </div>
    );
};

interface PositionableItem {
    id: string;
    x: number;
    y: number;
    scale: number;
    width?: number;
    content?: string;
}

interface PrintTemplatesProps {
    data: CrosswordData;
    themeAssets: any;
    formatConfig: any;
    grid: CellData[][];
    // State per le posizioni
    wmSheet1: PositionableItem;
    wmSheet2: PositionableItem;
    imgSheet2: PositionableItem;
    txtSheet2: PositionableItem;
    stickerGroup: PositionableItem;
    customTexts: PositionableItem[];
    // State logici
    printRenderKey: number;
    currentSheetPage: number;
    tagVariations: Array<{img: string, title: string}>;
    tagMessages: string[];
    showBorders: boolean;
    isCrossword: boolean;
    photos: string[];
    currentYear: number;
    editableMessage: string;
    pdfScaleFactor: number;
}

export const PrintTemplates = forwardRef<HTMLDivElement, PrintTemplatesProps>((props, ref) => {
    const {
        data, themeAssets, formatConfig, grid,
        wmSheet1, wmSheet2, imgSheet2, txtSheet2, stickerGroup, customTexts,
        printRenderKey, currentSheetPage, tagVariations, tagMessages,
        showBorders, isCrossword, photos, currentYear, editableMessage, pdfScaleFactor
    } = props;

    const printFontSize = data.words.length > 10 ? '7.5px' : '9px';

    const renderSolution = () => {
        if (!data.solution) return null;
        // @ts-ignore
        const rawString = data.solution.original || data.solution.word;
        const chars = rawString.split('');
        let letterIndexCounter = 0;
        const len = chars.length;
        const boxSize = len > 15 ? '14px' : (len > 10 ? '16px' : '20px');
        const fontSize = len > 15 ? '8px' : (len > 10 ? '10px' : '12px');
        const numFontSize = len > 15 ? '6px' : (len > 10 ? '7px' : '8px');

        return (
            <div className="mb-1 p-1 w-full flex justify-center pointer-events-auto">
                <div className="flex justify-center gap-1 flex-wrap items-center">
                    {chars.map((char: string, i: number) => {
                        const isSpace = !/[A-Z]/i.test(char);
                        if (isSpace) return <div key={i} style={{ width: String(parseInt(boxSize)*0.6)+'px', height: boxSize }}></div>;
                        letterIndexCounter++;
                        return (
                            <div key={i} style={{ width: boxSize, height: boxSize, backgroundColor: 'white', border: '1px solid #EAB308', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: fontSize, color: '#854D0E', position: 'relative', flexShrink: 0, overflow: 'hidden', lineHeight: 1 }}>
                                <span style={{ position: 'absolute', bottom: '1px', right: '1px', fontSize: numFontSize, color: '#B45309', fontWeight: 'bold', lineHeight: 1 }}>{getSolutionLabel(letterIndexCounter)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderGridCells = () => (
        <div className={`grid gap-[1px] bg-black/10 p-2 rounded-lg pointer-events-auto`} style={{ gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`, aspectRatio: `${data.width}/${data.height}`, width: '100%', maxHeight: '100%', margin: '0 auto' }}>
            {grid.map((row, y) => row.map((cell, x) => {
                if (!cell.char) return <div key={`${x}-${y}`} className={`bg-black/5 rounded-sm`} />;
                return (
                    <div key={`${x}-${y}`} className={`relative flex items-center justify-center w-full h-full text-xl font-bold rounded-sm`} style={{ backgroundColor: cell.isSolutionCell ? '#FEF08A' : '#FFFFFF', boxSizing: 'border-box' }}>
                        {cell.number && <span className={`absolute top-0 left-0 leading-none text-[8px] p-[1px] font-bold text-gray-500`}>{cell.number}</span>}
                        {cell.isSolutionCell && cell.solutionIndex !== undefined && <div className={`absolute bottom-0 right-0 leading-none font-bold text-gray-600 bg-white/60 rounded-tl-sm z-10 text-[8px] p-[1px]`}>{getSolutionLabel(cell.solutionIndex)}</div>}
                        <span className="font-bold text-lg"></span>
                    </div>
                );
            }))}
        </div>
    );

    // --- HELPER RENDER PER MINI 2x / STANDARD ---
    // overrideImage: usato per passare l'immagine specifica nel loop massivo
    const renderStandardSheet1 = (overrideImage?: string) => (
        <div style={{ width: '1123px', height: '794px', display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden', boxSizing: 'border-box', padding: '25px' }}>
            {data.hasWatermark && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet1.x * pdfScaleFactor}px, ${wmSheet1.y * pdfScaleFactor}px) scale(${wmSheet1.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
            )}
            <div style={{ width: '49%', marginRight: '1%', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', zIndex: 10, boxSizing: 'border-box', borderRight: 'none', border: showBorders ? themeAssets.pdfBorder : 'none' }}>
                <div style={{ fontSize: '80px', opacity: 0.2, marginBottom: '20px' }}>{themeAssets.decoration}</div>
                {data.images?.brandLogo && <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}><p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#9ca3af', marginBottom: '5px' }}>Created by</p><img src={data.images.brandLogo} style={{ height: '40px', objectFit: 'contain' }} /></div>}
            </div>
            
            <div style={{ width: '49%', marginLeft: '1%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', zIndex: 10, boxSizing: 'border-box', borderLeft: 'none', border: showBorders ? themeAssets.pdfBorder : 'none' }}>
                {/* LOGICA IMMAGINE: Se c'è override (dal loop) usa quello, altrimenti extraImage, altrimenti placeholder */}
                {overrideImage ? (
                    <div style={{ width: '100%', height: '100%', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={overrideImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                ) : data.images?.extraImage ? (
                     <div style={{ width: '100%', height: '100%', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={data.images.extraImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                ) : <div style={{ fontSize: '120px', opacity: 0.8 }}>{themeAssets.decoration}</div>}
            </div>
        </div>
    );

    // overrideMessage: usato per passare il messaggio specifico nel loop massivo
    const renderStandardSheet2 = (overrideMessage?: string) => (
        <div style={{ width: '1123px', height: '794px', display: 'flex', position: 'relative', backgroundColor: 'white', overflow: 'hidden', boxSizing: 'border-box', padding: '25px' }}>
            {data.hasWatermark && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${wmSheet2.x * pdfScaleFactor}px, ${wmSheet2.y * pdfScaleFactor}px) scale(${wmSheet2.scale}) rotate(12deg)`, fontSize: '130px', opacity: 0.20, zIndex: 0, whiteSpace: 'nowrap' }}>{themeAssets.watermark}</div>
            )}
            
            <div style={{ width: '49%', marginRight: '1%', height: '100%', position: 'relative', zIndex: 10, boxSizing: 'border-box', overflow: 'hidden', borderRight: 'none', border: showBorders ? themeAssets.pdfBorder : 'none' }}>
                <div style={{ width: '100%', height: '100%', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'space-between' }}>
                    <div style={{marginBottom: '10px', width: '100%', flexShrink: 0}}>
                        <h1 className={themeAssets.fontTitle} style={{ fontSize: '40px', marginBottom: '5px', lineHeight: 1.2 }}>{data.title}</h1>
                        <p style={{ fontSize: '14px', textTransform: 'uppercase', color: '#666', letterSpacing: '2px' }}>{data.eventDate || "Data Speciale"} • {currentYear}</p>
                    </div>
                    {/* Nel Mini 2x, le foto interne NON sono variabili per ora */}
                    <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden', minHeight: 0, margin: '10px 0', position: 'relative' }}>
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translate(${imgSheet2.x * pdfScaleFactor}px, ${imgSheet2.y * pdfScaleFactor}px) scale(${imgSheet2.scale})` }}>
                            {photos.length === 1 ? (
                                <img src={photos[0]} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', border: '5px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', backgroundColor: '#f3f4f6', transform: 'rotate(1deg)' }} />
                            ) : photos.length > 1 ? (
                                <div style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', aspectRatio: '1/1', border: '5px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', backgroundColor: '#f3f4f6', transform: 'rotate(1deg)' }}>
                                    <PhotoCollage photos={photos} />
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div style={{ flexShrink: 0, width: '100%', position: 'relative', minHeight: '50px' }}>
                        <div style={{ transform: `translate(${txtSheet2.x * pdfScaleFactor}px, ${txtSheet2.y * pdfScaleFactor}px) scale(${txtSheet2.scale})` }}>
                            <p className={themeAssets.fontTitle} style={{ fontSize: '24px', lineHeight: 1.5 }}>"{overrideMessage || editableMessage}"</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={{ width: '49%', marginLeft: '1%', height: '100%', position: 'relative', zIndex: 10, boxSizing: 'border-box', overflow: 'hidden', borderLeft: 'none', border: showBorders ? themeAssets.pdfBorder : 'none' }}>
                <div style={{ width: '100%', height: '100%', padding: '40px', paddingRight: '50px', display: 'flex', flexDirection: 'column' }}>
                    {isCrossword ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        <div style={{ flexShrink: 0 }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid black', marginBottom: '10px', paddingBottom: '5px', textAlign: 'center', letterSpacing: '2px' }}>Cruciverba</h2>
                                {renderSolution()}
                        </div>
                        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {renderGridCells()}
                            </div>
                        </div>
                        <div style={{ flexShrink: 0, fontSize: printFontSize, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', lineHeight: 1.1, borderTop: '2px solid black', paddingTop: '10px' }}>
                                <div><b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '4px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Orizzontali</b>{data.words.filter(w=>w.direction===DirEnum.ACROSS).map(w=><div key={w.id} style={{ marginBottom: '2px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue}</div>)}</div>
                                <div><b style={{ display: 'block', borderBottom: '1px solid #ccc', marginBottom: '4px', paddingBottom: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Verticali</b>{data.words.filter(w=>w.direction===DirEnum.DOWN).map(w=><div key={w.id} style={{ marginBottom: '2px', whiteSpace: 'normal' }}><b style={{ marginRight: '4px' }}>{w.number}.</b>{w.clue}</div>)}</div>
                        </div>
                    </div>
                ) : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc', borderRadius: '10px', opacity: 0.3 }}></div>}
                </div>
            </div>

            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${stickerGroup.x * pdfScaleFactor}px, ${stickerGroup.y * pdfScaleFactor}px) scale(${stickerGroup.scale})`, pointerEvents: 'none', zIndex: 50 }}>
                <div style={{display:'flex', gap:'10px', fontSize:'50px'}}>{(data.stickers || []).slice(0,5).map((s,i) => <span key={i}>{s}</span>)}</div>
            </div>
            {customTexts.map(t => (
                <div key={t.id} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${t.x * pdfScaleFactor}px, ${t.y * pdfScaleFactor}px)`, pointerEvents: 'none', zIndex: 50 }}>
                    <div style={{ width: `${(t.width || 250) * pdfScaleFactor}px` }}>
                        <p className="font-hand" style={{ fontSize: `${(t.scale * 20) * pdfScaleFactor}px`, lineHeight: 1.2, color: '#581c87', textAlign: 'center', wordWrap: 'break-word' }}>{t.content}</p>
                    </div>
                </div>
            ))}
        </div>
    );

    // --- RENDER CONTENT PER IL FORMATO MINI E QUADRATO (2 SU UN A4) ---
    const renderMini2x = () => (
        <div key={`${printRenderKey}-${currentSheetPage}`}>
            {/* SHEET 1: COPERTINE ESTERNE (Fronte/Retro) */}
            <div id="pdf-sheet-1" style={{ width: '794px', height: '1123px', display: 'flex', flexDirection: 'column', backgroundColor: 'white', boxSizing: 'border-box' }}>
                {Array(2).fill(null).map((_, i) => {
                    const globalIndex = (currentSheetPage * 2) + i;
                    
                    // FIX: Qui usiamo 'i' per l'immagine perché tagVariations è rigenerato per pagina
                    const v = tagVariations[i]; 
                    
                    // FIX: Qui usiamo 'globalIndex' per i messaggi perché tagMessages è l'array completo
                    const msg = tagMessages[globalIndex] || ""; 
                    
                    const overrideImg = v ? v.img : undefined;

                    return (
                        <div key={i} style={{ height: '50%', width: '100%', borderBottom: i === 0 ? '1px dashed #ccc' : 'none', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '1123px', height: '794px', transform: 'scale(0.707)', transformOrigin: 'center center' }}>
                                {renderStandardSheet1(overrideImg)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* SHEET 2: INTERNI */}
            <div id="pdf-sheet-2" style={{ width: '794px', height: '1123px', display: 'flex', flexDirection: 'column', backgroundColor: 'white', boxSizing: 'border-box' }}>
                {Array(2).fill(null).map((_, i) => {
                    const globalIndex = (currentSheetPage * 2) + i;
                    // FIX: Anche qui 'globalIndex' per il messaggio
                    const msg = tagMessages[globalIndex] || "";
                    
                    return (
                        <div key={i} style={{ height: '50%', width: '100%', borderBottom: i === 0 ? '1px dashed #ccc' : 'none', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '1123px', height: '794px', transform: 'scale(0.707)', transformOrigin: 'center center' }}>
                                {renderStandardSheet2(msg)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div ref={ref} style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -100 }}>
            {data.format === 'tags' ? (
                // TAGS LAYOUT
                <div key={`${printRenderKey}-${currentSheetPage}`}>
                    <div id="pdf-sheet-1" style={{ width: '794px', height: '1123px', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', padding: '0', margin: '0', backgroundColor: 'white', boxSizing: 'border-box' }}>
                        {Array(8).fill(null).map((_, i) => {
                             const v = tagVariations[i];
                             if (!v) return <div key={i} style={{ width: '397px', height: '280px' }}></div>;
                             return (
                            <div key={i} style={{ width: '397px', height: '280px', boxSizing: 'border-box', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', border: '1px dashed #e5e7eb' }}>
                                     <div style={{ width: '50%', height: '100%', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                         {data.images?.brandLogo ? (
                                             <img src={data.images.brandLogo} style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain', opacity: 0.5 }} />
                                         ) : (
                                             <div style={{ position: 'absolute', bottom: '5px', width: '100%', textAlign: 'center' }}>
                                                 <span style={{ fontSize: '6px', color: '#d1d5db', textTransform: 'uppercase' }}>Created by Enigmistica</span>
                                             </div>
                                         )}
                                     </div>
                                     <div style={{ width: '50%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                                          {v.img ? (
                                              <img src={v.img} crossOrigin="anonymous" loading="eager" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; if(e.currentTarget.parentElement) e.currentTarget.parentElement.style.backgroundColor = '#e5e7eb'; }} />
                                          ) : <div style={{width:'100%', height:'100%', background: '#eee'}}></div>}
                                     </div>
                                </div>
                            </div>
                        )})}
                    </div>

                    <div id="pdf-sheet-2" style={{ width: '794px', height: '1123px', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', padding: '0', margin: '0', backgroundColor: 'white', boxSizing: 'border-box' }}>
                        {Array(8).fill(null).map((_, i) => {
                            const dataIndex = i % 2 === 0 ? i + 1 : i - 1;
                            const v = tagVariations[dataIndex];
                            const globalIndex = (currentSheetPage * 8) + dataIndex;
                            const msg = tagMessages[globalIndex] || tagMessages[dataIndex] || "";

                            if (!v) return <div key={i} style={{ width: '397px', height: '280px' }}></div>;
                            
                            const displayDate = data.theme === 'christmas' ? `SS. Natale ${currentYear}` : (data.eventDate || currentYear.toString());

                            return (
                                <div key={i} style={{ width: '397px', height: '280px', boxSizing: 'border-box', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', border: '1px dashed #e5e7eb' }}>
                                        <div style={{ width: '50%', height: '100%', padding: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', borderRight: '1px dotted #eee', boxSizing: 'border-box' }}>
                                            {data.recipientName && <div style={{fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '5px'}}>A: {data.recipientName}</div>}
                                        </div>
                                        <div style={{ width: '50%', height: '100%', padding: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'start', textAlign: 'center', boxSizing: 'border-box' }}>
                                            <div style={{ fontSize: '8px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold', marginBottom: '5px' }}>{displayDate}</div>
                                            <div className={themeAssets.fontTitle} style={{ fontSize: '16px', color: '#1f2937', lineHeight: '1', marginBottom: '5px' }}>{v.title}</div>
                                            <div style={{ fontSize: '9px', fontStyle: 'italic', color: '#4b5563', whiteSpace: 'pre-wrap', wordBreak: 'break-word', width: '100%' }}>{msg}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (data.format === 'a6_2x' || data.format === 'square') ? (
                // MINI A6 LAYOUT OR SQUARE (2 su A4) - ORA CENTRATI PERFETTAMENTE
                renderMini2x()
            ) : (
                // STANDARD CARD LAYOUT (A4/A3)
                <div key={printRenderKey}>
                    <div id="pdf-sheet-1" style={{ width: `${formatConfig.pdfWidth}px`, height: `${formatConfig.pdfHeight}px` }}>{renderStandardSheet1()}</div>
                    <div id="pdf-sheet-2" style={{ width: `${formatConfig.pdfWidth}px`, height: `${formatConfig.pdfHeight}px` }}>{renderStandardSheet2()}</div>
                </div>
            )}
       </div>
    );
});
