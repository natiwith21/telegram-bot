import React from "react";

export default function App() {
  return (
    <div className="bingo-container">
      <style>{`
        body, html {
          margin: 0;
          padding: 0;
          background-color: #d2a4e5;
          font-family: 'Poppins', sans-serif;
        }

        .bingo-container {
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
          background-color: #c39cd9;
          padding: 10px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .top-bar {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          text-align: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          color: #1c1c2e;
          padding: 6px 0;
        }

        .separator {
          width: 100%;
          height: 1px;
          background-color: rgba(28,28,46,0.2);
          margin: 6px 0;
        }

        .main-section {
          display: flex;
          justify-content: space-between;
          width: 100%;
          gap: 6px;
          margin-top: 6px;
        }

        .left-board {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 5px;
          background: rgba(255,255,255,0.2);
          padding: 8px;
          border-radius: 10px;
        }

        .left-board div {
          background: rgba(255,255,255,0.5);
          text-align: center;
          padding: 4px 0;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: #333;
        }

        .bingo-header {
          grid-column: span 5;
          display: flex;
          justify-content: space-around;
        }

        .bingo-header span {
          font-weight: 700;
          color: white;
          padding: 3px 8px;
          border-radius: 50%;
        }

        .bingo-header span:nth-child(1){ background:#f7b733; }
        .bingo-header span:nth-child(2){ background:#6dd47e; }
        .bingo-header span:nth-child(3){ background:#5dc0f3; }
        .bingo-header span:nth-child(4){ background:#e94f37; }
        .bingo-header span:nth-child(5){ background:#9b59b6; }

        .right-board {
          flex: 1;
          background: rgba(255,255,255,0.2);
          padding: 8px;
          border-radius: 10px;
          text-align: center;
        }

        .count-section {
          background: #b080d0;
          color: white;
          border-radius: 6px;
          padding: 6px;
          margin-bottom: 6px;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .count-box {
          width: 40px;
          height: 28px;
          background: white;
          color: #1c1c2e;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-weight: bold;
        }

        .current-call {
          background: #9a6cc3;
          border-radius: 10px;
          padding: 6px;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .call-circle {
          width: 40px;
          height: 40px;
          background: orange;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-top: 6px;
        }

        .small-board {
          background: rgba(255,255,255,0.3);
          margin-top: 8px;
          padding: 10px;
          border-radius: 10px;
        }

        .small-header {
          display: flex;
          justify-content: space-around;
          margin-bottom: 6px;
        }

        .small-header span {
          font-weight: 700;
          color: white;
          padding: 3px 8px;
          border-radius: 50%;
        }

        .small-header span:nth-child(1){ background:#f7b733; }
        .small-header span:nth-child(2){ background:#6dd47e; }
        .small-header span:nth-child(3){ background:#5dc0f3; }
        .small-header span:nth-child(4){ background:#e94f37; }
        .small-header span:nth-child(5){ background:#9b59b6; }

        .board-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
        }

        .board-grid div {
          background: rgba(255,255,255,0.8);
          border-radius: 6px;
          padding: 6px 0;
          font-weight: 600;
          font-size: 13px;
          color: #333;
        }

        .board-grid .center {
          background: #34793e;
          color: white;
        }

        .board-number {
          margin-top: 6px;
          font-size: 12px;
          color: #333;
        }

        .bottom-buttons {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 15px;
          gap: 10px;
        }

        .bingo-btn {
          width: 80%;
          background: linear-gradient(90deg, #ff8c00, #ff5e00);
          border: none;
          color: white;
          padding: 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
        }

        .bottom-row {
          width: 80%;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .refresh-btn,
        .leave-btn {
          flex: 1;
          border: none;
          color: white;
          padding: 10px;
          border-radius: 20px;
          font-weight: bold;
          cursor: pointer;
        }

        .refresh-btn { background: #4aa8e8; }
        .leave-btn { background: #e74c3c; }

        /* Bottom Menu - full width white rectangle, no padding/margin */
        .bottom-menu {
          display: flex;
          justify-content: space-around;
          background: white;
          width: 100%;
        
          margin-top:15px;
          padding: 0;
          border-radius: 0;
        }

        .bottom-menu div {
          font-size: 12px;
          color: #333;
          text-align: center;
          flex: 1;
          padding: 10px 0;
        }
      `}</style>

      {/* Top Bar */}
      <div className="top-bar">
        <div>Game <strong>AU5720</strong></div>
        <div>Derash -</div>
        <div>Bonus <strong>Off</strong></div>
        <div>Players -</div>
        <div>Stake <strong>0</strong></div>
        <div>Call <strong>0</strong></div>
        <div>Sound <strong>🔇</strong></div>
        <div>Mode <strong>Bingo</strong></div>
      </div>

      <div className="separator"></div>

      {/* Main Section */}
      <div className="main-section">
        <div className="left-board">
          <div className="bingo-header">
            <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
          </div>
          {Array.from({ length: 15 }).map((_, i) => (
            <React.Fragment key={i}>
              {[1,2,3,4,5].map((c,j)=>(
                <div key={i*5+j}>{i + j*15 +1}</div>
              ))}
            </React.Fragment>
          ))}
        </div>

        <div className="right-board">
          <div className="count-section">
            Count Down
            <div className="count-box">-</div>
          </div>

          <div className="current-call">
            <div>Current Call</div>
            <div className="call-circle">-</div>
          </div>

          <div className="small-board">
            <div className="small-header">
              <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
            </div>
            <div className="board-grid">
              {[
                [13, 28, 38, 58, 71],
                [14, 22, 44, 51, 73],
                [5, 26, "*", 56, 61],
                [12, 24, 34, 53, 72],
                [8, 17, 40, 52, 62],
              ].map((row,rIdx)=>row.map((num,cIdx)=>(
                <div key={rIdx + "-" + cIdx} className={num==="*"?"center":""}>{num}</div>
              )))}
            </div>
            <div className="board-number">Board number 67</div>
          </div>
        </div>
      </div>

      <div className="bottom-buttons">
        <button className="bingo-btn">Bingo</button>
        <div className="bottom-row">
          <button className="refresh-btn">Refresh</button>
          <button className="leave-btn">Leave</button>
        </div>
      </div>

      {/* Bottom Menu */}
      <div className="bottom-menu">
        <div>🎮 Game</div>
        <div>🏆 Scores</div>
        <div>🕓 History</div>
        <div>💰 Wallet</div>
        <div>👤 Profile</div>
      </div>
    </div>
  );
}
