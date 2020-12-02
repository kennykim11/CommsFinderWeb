import numpy as np
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from argparse import ArgumentParser
import json
import itertools


def main(args):
    with open(args.infile) as f:
        data = json.load(f)
    data = list(data.values())[1:]
    data = [
        d for d in data
        if all(v is not None for v in d.values())
    ]
    # print(json.dumps(data[0], indent=2))
    
    ex, ey = data[0]['eX'], data[0]['eY']
    
    px = np.array([d['pX'] for d in data])
    py = np.array([d['pY'] for d in data])
    
    freq = np.array([d['freq'] for d in data])
    # moving_avg_len = 5
    # freq[(moving_avg_len-1)//2:-(moving_avg_len-1)//2] = \
    #     np.convolve(freq, np.ones(moving_avg_len), 'valid') / moving_avg_len
    
    speed = np.array([d['pV'] for d in data])
    # speed[:] = 1.5
    
    heading = np.array([d['pH'] for d in data])
    
    base_freq = 1 / 20
    wave_speed = 1
    
    print(freq.mean(), base_freq)
    # freq = base_freq * (1 + spd / wave_speed)
    # spd = speed*cos(theta)
    
    ##########
    """
    # get the actual theoretical observed frequency
    delta_pos = np.stack((ex-px, ey-py), axis=-1)
    delta_pos /= np.linalg.norm(delta_pos, axis=-1, keepdims=True)
    heading_vec = np.stack((np.cos(heading), np.sin(heading)), axis=-1)
    ct = (delta_pos*heading_vec).sum(axis=-1)
    freq = base_freq * (1 + speed*ct / wave_speed)
    freq *= np.random.lognormal(sigma=0.003, size=freq.shape)
    #"""
    ##########
    
    # wave_speed * (freq/base_freq - 1) = speed*cos(theta)
    cos_theta = wave_speed/speed * (freq/base_freq - 1)
    with np.printoptions(suppress=True):
        print(cos_theta)
    cos_theta = cos_theta.clip(-1, 1)
    theta = np.arccos(cos_theta)
    # print(freq)
    # print(theta)
    # print(speed)
    
    # plt.plot(px, py, c='black', zorder=1)
    plt.scatter(px, py, c=freq, zorder=2)
    plt.plot([ex], [ey], '.', c='red', zorder=3)
    
    line_len = 3000
    def solve(heur_x, heur_y, debug=False):
        vecs = []
        bs = []
        for i in range(len(data)):
            x, y = px[i], py[i]
            def plot(angle):
                vecs.append([np.sin(angle), -np.cos(angle)])
                bs.append(np.dot([x, y], vecs[-1]))
                
                if debug:
                    dx, dy = line_len*np.cos(angle), line_len*np.sin(angle)
                    plt.gca().add_artist(Line2D([x, x+dx], [y, y+dy],
                            color='black', alpha=0.1, zorder=0))
            
            if True:
                def f(x, y):
                    return x*np.sin(heading[i]) - y*np.cos(heading[i])
                if f(heur_x, heur_y) < f(x, y):
                    plot(heading[i] + theta[i])
                else:
                    plot(heading[i] - theta[i])
            else:
                plot(heading[i] + theta[i])
                plot(heading[i] - theta[i])
        
        (est_x, est_y), (res,), rank, s = np.linalg.lstsq(vecs, bs, rcond=None)
        return est_x, est_y
    
    print('solving')
    est_x, est_y = px.mean(), py.mean()
    # est_x, est_y = ex, ey
    for i in itertools.count(start=1):
        plt.plot([est_x], [est_y], '.', c='purple', zorder=3)
        e2x, e2y = solve(est_x, est_y)
        if (e2x, e2y) == (est_x, est_y):
            print(f'converged after {i} iterations: ({est_x:.2f}, {est_y:.2f})')
            break
        est_x, est_y = e2x, e2y
    
    solve(est_x, est_y, debug=True)
    plt.plot([est_x], [est_y], '.', c='blue', zorder=3)
    
    plt.axis('equal')
    plt.gca().invert_yaxis()
    plt.show()


def parse_args():
    """Define, parse, and return the command-line arguments."""
    parser = ArgumentParser(description='TODO')
    parser.add_argument('infile',
                        help='the input data file')
    
    return parser.parse_args()

if __name__ == '__main__':
    main(parse_args())
