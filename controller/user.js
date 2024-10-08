import bcrypt from 'bcrypt';
import db from '../models/index.js';
import jwt from 'jsonwebtoken';
const User = db.User;

// 회원가입
export const signup = async (req, res) => {
    try {
        // console.log('회원가입 - req.body', req.body);
        const { username, email, password } = req.body;

        const find = await User.findOne({ where: { email } });
        if (find) {
            res.status(400).json({ result: false, message: '이미 존재하는 회원입니다.' });
        } else {
            // 암호화
            const encryption = await bcrypt.hash(password, 10);
            const result = await User.create({
                username,
                email,
                password: encryption,
            });
            console.log('회원가입 - result', result);
            res.json({ result: true, message: '회원가입 성공' });
        }
    } catch (error) {
        console.log('회원가입 오류: ', error);
        res.status(500).json({ result: false, message: '서버오류' });
    }
};

// 로그인
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const find = await User.findOne({ where: { email } });
        // console.log('find', find); // 유저정보

        if (find) {
            const decryption = await bcrypt.compare(password, find.password);
            // console.log('decryption', decryption); // true

            if (decryption) {
                const response = {
                    id: find.id,
                    username: find.username,
                    email: find.email,
                };

                // toke 발급
                const token = jwt.sign({ user: response }, process.env.JWT_ACCESS_SECRET, {
                    expiresIn: process.env.JWT_ACCESS_LIFETIME, // 일반적으로 짧게 (15분 정도)
                });

                res.status(200).json({
                    code: 200,
                    message: '로그인 성공. 토큰이 발급되었습니다.',
                    token: token,
                    response: response, // 사용자 정보
                });
            } else {
                res.status(401).json({ result: false, code: 401, response: null, message: '비밀번호가 틀렸습니다' }); // password가 다른경우
            }
        } else {
            res.status(404).json({ result: false, code: 404, response: null, message: '회원이 아닙니다.' });
        }
    } catch (error) {
        console.log('로그인 오류: ', error);
        res.status(500).json({ result: false, message: '서버오류' });
    }
};

// 로그아웃
export const logout = async (req, res) => {
    try {
        const { userId } = req; // 로그인한 사용자 ID

        // 데이터베이스에서 리프레시 토큰 삭제
        // await User.update({ refreshToken: null }, { where: { id: userId } });

        // 쿠키에서 액세스 토큰 삭제
        res.cookie('accessToken', '', {
            maxAge: 0, // 쿠키 삭제
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
        });

        res.status(200).json({ result: true, message: '로그아웃 성공' });
    } catch (error) {
        console.log('로그아웃 오류: ', error);
        res.status(500).json({ result: false, message: '서버오류' });
    }
};

export const refreshToken = async (req, res) => {
    const { token, userInfo } = req.body;
    // console.log('headers', req.headers);
    // console.log('body', req.body);
    // console.log('refreshToken-token', token);
    // console.log('refreshToken-userInfo', userInfo);
    // 현재 접속한 유저와 db에 있는 유저를 비교하고 서로 맞다면 토큰을 재발급해줌
    // 그게 아니라면 발급을 해주지 않음
    try {
        const find = await User.findOne({ where: { email: userInfo.email } });
        if (!find) {
            return res.status(404).json({ result: false, message: '유저 정보가 없습니다.' });
        }
        const newToken = jwt.sign({ user: userInfo }, process.env.JWT_ACCESS_SECRET, {
            expiresIn: process.env.JWT_ACCESS_LIFETIME,
        });
        res.status(200).json({
            code: 200,
            message: '새로운 토큰이 발급되었습니다.',
            userInfo: userInfo,
            token: newToken,
        });
    } catch (error) {
        console.error('리프레시 토큰 오류: ', error);
        res.status(500).json({ result: false, message: '서버오류' });
    }
};

export const tokenCheck = async (req, res) => {
    const { token, userInfo } = req.body;
    console.log('token', token);
    console.log('userInfo', userInfo);
};
